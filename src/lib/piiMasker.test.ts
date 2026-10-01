import { describe, expect, it } from 'bun:test';
import { auditMask, makeRehydrator, maskText, nombresDeFicha, rehydrateText } from './piiMasker';

// Casos portados de navitolegisv3/tests/piiMasker.test.ts (misma regla, misma expectativa) más
// los dos que la versión heredada no cubría: elegir los nombres de la ficha y rehidratar un
// stream donde un token viene partido.

describe('maskText · identificadores', () => {
  it('enmascara correos', () => {
    const { masked, mapping } = maskText('Escriba a abogado@despacho.com');
    expect(masked).toContain('<PII_CORREO_0>');
    expect(rehydrateText(masked, mapping)).toBe('Escriba a abogado@despacho.com');
  });

  it('enmascara teléfonos móviles con y sin +57', () => {
    const { masked } = maskText('Llame al 310 555 7788 o al +57-320.111.2233');
    expect(masked).not.toContain('310 555 7788');
    expect(masked).not.toContain('320.111.2233');
  });

  it('enmascara radicados judiciales completos', () => {
    const { masked } = maskText('Radicado 05001-31-03-006-2022-00342-01 del Juzgado 29.');
    expect(masked).toContain('<PII_RADICADO_0>');
    expect(masked).toContain('del Juzgado 29.');
  });

  it('enmascara cédulas sin separadores', () => {
    const { masked } = maskText('El demandado, cédula 71245987, compareció.');
    expect(masked).toContain('<PII_CEDULA_');
    expect(masked).toContain('compareció');
  });

  it('enmascara cédulas con puntos de millares', () => {
    expect(maskText('Identificado con cédula 71.245.987 de Medellín.').masked).toContain('<PII_CEDULA_');
  });

  it('enmascara NIT', () => {
    expect(maskText('NIT 900.123.456-7 del acreedor.').masked).toContain('<PII_NIT_');
  });

  it('enmascara direcciones con nomenclatura completa', () => {
    expect(maskText('Predio en Carrera 43A # 18-95, Medellín.').masked).toContain('<PII_DIRECCION_');
  });
});

describe('maskText · lo que NO debe tocarse', () => {
  it('no toca las cuantías: el modelo las necesita', () => {
    const texto = 'Capital de $340.000.000 más intereses y costas.';
    expect(maskText(texto).masked).toBe(texto);
  });

  it('no toca artículos ni normas', () => {
    const texto = 'Conforme al artículo 431 del CGP y al Art. 461, el término es de cinco días.';
    expect(maskText(texto).masked).toBe(texto);
  });

  it('no toca los años', () => {
    const texto = 'Sentencia SC-3097 de 2022, auto del 2019.';
    expect(maskText(texto).masked).toBe(texto);
  });
});

describe('maskText · nombres conocidos', () => {
  it('enmascara los nombres declarados y no adivina otros', () => {
    const { masked } = maskText('El demandante Cesar Augusto Giraldo García y el Juzgado 29 Civil.', {
      nombres: ['Cesar Augusto Giraldo García'],
    });
    expect(masked).toContain('<PII_NOMBRE_');
    expect(masked).toContain('Juzgado 29 Civil');
  });

  it('es consistente: el mismo nombre, la misma etiqueta', () => {
    const { masked, mapping } = maskText('Ana Pérez demandó. Ana Pérez insistió.', { nombres: ['Ana Pérez'] });
    expect(masked).toBe('<PII_NOMBRE_0> demandó. <PII_NOMBRE_0> insistió.');
    expect(mapping).toHaveLength(1);
  });

  it('ignora nombres demasiado cortos para ser fiables', () => {
    expect(maskText('Comparece Ana.', { nombres: ['Ana'] }).masked).toBe('Comparece Ana.');
  });

  it('enmascara el nombre aunque venga en minúsculas en el texto', () => {
    const { masked } = maskText('Comparece césar augusto giraldo garcía hoy.', {
      nombres: ['César Augusto Giraldo García'],
    });
    expect(masked).toContain('<PII_NOMBRE_0>');
  });
});

describe('nombresDeFicha · de la ficha del expediente al enmascarador', () => {
  it('toma demandante y demandado', () => {
    expect(nombresDeFicha(['Cesar Augusto Giraldo García', 'Ferretería El Hogar S.A.S.'])).toEqual([
      'Cesar Augusto Giraldo García',
      'Ferretería El Hogar S.A.S.',
    ]);
  });

  it('descarta marcadores de "no hay dato"', () => {
    expect(nombresDeFicha(['No especificado', 'N/A', 'Desconocido', '', '   ', null, undefined])).toEqual([]);
  });

  it('descarta valores demasiado cortos y no repite', () => {
    expect(nombresDeFicha(['Ana', 'Ana', 'ANA'])).toEqual([]);
  });

  it('sin lista de nombres, el enmascarador no toca ningún nombre', () => {
    const texto = 'Demandante: Cesar Augusto Giraldo García.';
    expect(maskText(texto, { nombres: nombresDeFicha([null, 'No consta']) }).masked).toBe(texto);
  });
});

describe('rehydrateText y auditoría', () => {
  it('devuelve el texto original completo', () => {
    const original = 'Radicado 05001-31-03-006-2022-00342-01, demandado con cédula 71245987 y correo a@b.co';
    const { masked, mapping } = maskText(original);
    expect(rehydrateText(masked, mapping)).toBe(original);
  });

  it('sin mapeo no cambia nada', () => {
    expect(rehydrateText('texto sin tokens', [])).toBe('texto sin tokens');
  });

  it('auditMask cuenta por tipo', () => {
    const { count, types } = auditMask('a@b.co, c@d.co y cédula 71245987');
    expect(count).toBe(3);
    expect(types.correo).toBe(2);
    expect(types.cedula).toBe(1);
  });

  it('no se rompe con texto vacío', () => {
    expect(maskText('').masked).toBe('');
    expect(maskText(null as any).masked).toBe('');
  });
});

describe('makeRehydrator · streaming', () => {
  const mapping = maskText('Cesar Augusto Giraldo García', { nombres: ['Cesar Augusto Giraldo García'] }).mapping;

  it('rehidrata un token que llega completo en un trozo', () => {
    const r = makeRehydrator(mapping);
    const salida = r.push('El demandante <PII_NOMBRE_0> insistió.') + r.flush();
    expect(salida).toBe('El demandante Cesar Augusto Giraldo García insistió.');
  });

  it('rehidrata un token partido entre dos trozos', () => {
    const r = makeRehydrator(mapping);
    const salida = r.push('El demandante <PII_NOM') + r.push('BRE_0> insistió.') + r.flush();
    expect(salida).toBe('El demandante Cesar Augusto Giraldo García insistió.');
  });

  it('rehidrata un token partido letra por letra', () => {
    const r = makeRehydrator(mapping);
    let salida = '';
    for (const c of 'Vease <PII_NOMBRE_0> ahora.') salida += r.push(c);
    salida += r.flush();
    expect(salida).toBe('Vease Cesar Augusto Giraldo García ahora.');
  });

  it('no retiene texto que solo parece un token sin serlo', () => {
    const r = makeRehydrator(mapping);
    // '<' que no abre un token: no puede quedarse retenido para siempre.
    const salida = r.push('comparación 3 < 5 y ' + 'x'.repeat(40)) + r.flush();
    expect(salida).toBe('comparación 3 < 5 y ' + 'x'.repeat(40));
  });

  it('sin mapeo deja pasar el texto tal cual', () => {
    const r = makeRehydrator([]);
    expect(r.push('texto normal') + r.flush()).toBe('texto normal');
  });

  it('la salida concatenada es igual a rehidratar de una vez', () => {
    const texto = 'Cesar Augusto Giraldo García pidió, y Cesar Augusto Giraldo García insistió.';
    const { masked, mapping: m } = maskText(texto, { nombres: ['Cesar Augusto Giraldo García'] });
    const r = makeRehydrator(m);
    let junta = '';
    for (let i = 0; i < masked.length; i += 3) junta += r.push(masked.slice(i, i + 3));
    junta += r.flush();
    expect(junta).toBe(texto);
  });
});
