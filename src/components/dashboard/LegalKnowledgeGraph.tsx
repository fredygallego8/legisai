import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Network, Info, ShieldAlert, CheckCircle, ExternalLink, RefreshCw } from 'lucide-react';

interface NodeDatum extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  category: 'expediente' | 'norma' | 'sentencia' | 'articulo';
  description: string;
  impacto: string;
  color?: string;
  radius?: number;
}

interface LinkDatum extends d3.SimulationLinkDatum<NodeDatum> {
  source: string | NodeDatum;
  target: string | NodeDatum;
  label: string;
}

export const LegalKnowledgeGraph: React.FC = () => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [selectedNode, setSelectedNode] = useState<NodeDatum | null>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth || 800;
    const height = 500;

    // Limpiar previo
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height]);

    // Zoom behavior
    const g = svg.append('g');
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Datos del Grafo de Conocimiento (Expediente Hipoteca Santa Gema vs Normas Colombianas)
    const nodes: NodeDatum[] = [
      {
        id: 'exp-santa-gema',
        name: 'Hipoteca Santa Gema (Rad: 05001-2024-01450)',
        category: 'expediente',
        description: 'Proceso Ejecutivo Hipotecario con Medida Cautelar. Terminación por Pago Total (Art. 461 CGP).',
        impacto: 'Caso principal en ejecución de garantía real.',
        color: '#4f46e5', // Indigo 600
        radius: 36
      },
      {
        id: 'norm-cc',
        name: 'Código Civil (Arts. 2432 - 2457)',
        category: 'norma',
        description: 'Derecho real de hipoteca, indivisibilidad y persecución sobre el inmueble.',
        impacto: 'Funda la existencia del gravamen real y la persecución del predio.',
        color: '#0284c7', // Sky 600
        radius: 26
      },
      {
        id: 'norm-ley546',
        name: 'Ley 546 de 1999 (Ley de Vivienda)',
        category: 'norma',
        description: 'Financiación de vivienda en Pesos y UVR, prohibición de capitalización de intereses.',
        impacto: 'Protege contra anatocismo y fija abonos extraordinarios sin sanción.',
        color: '#0d9488', // Teal 600
        radius: 26
      },
      {
        id: 'norm-cgp',
        name: 'Código General del Proceso (Art. 468)',
        category: 'norma',
        description: 'Trámite del proceso ejecutivo con garantía real, embargo y secuestro.',
        impacto: 'Norma procesal rectora del mandamiento ejecutivo y medidas cautelares.',
        color: '#7c3aed', // Violet 600
        radius: 28
      },
      {
        id: 'norm-ley2445',
        name: 'Ley 2445 de 2025 (Insolvencia)',
        category: 'norma',
        description: 'Reforma al régimen de insolvencia y suspensión temporal de remates.',
        impacto: 'Otorga herramientas de salvamento y suspensión de apremios.',
        color: '#d97706', // Amber 600
        radius: 22
      },
      {
        id: 'norm-ley1579',
        name: 'Ley 1579 de 2012 (Estatuto Registral)',
        category: 'norma',
        description: 'Término perentorio de 90 días hábiles para inscripción registral en ORIP.',
        impacto: 'Garantiza oponibilidad y prelación de la garantía hipotecaria.',
        color: '#db2777', // Pink 600
        radius: 22
      },
      {
        id: 'norm-ley45',
        name: 'Ley 45 de 1990 (Art. 72 - Usura)',
        category: 'norma',
        description: 'Sanción por cobro de intereses por encima de la tasa de usura.',
        impacto: 'Verifica la legalidad de los intereses liquidatorios del crédito.',
        color: '#ea580c', // Orange 600
        radius: 22
      },
      {
        id: 'sent-sc3097',
        name: 'Sentencia SC-3097 de 2022 (CSJ)',
        category: 'sentencia',
        description: 'Principio de indivisibilidad y validez de la hipoteca abierta sin límite de cuantía.',
        impacto: 'Precedente de casación aplicable a la exigibilidad de obligaciones.',
        color: '#16a34a', // Green 600
        radius: 24
      }
    ];

    const links: LinkDatum[] = [
      { source: 'exp-santa-gema', target: 'norm-cc', label: 'Constitución Garantía' },
      { source: 'exp-santa-gema', target: 'norm-ley546', label: 'Liquidación & UVR' },
      { source: 'exp-santa-gema', target: 'norm-cgp', label: 'Mandamiento Ejec. & Medidas' },
      { source: 'exp-santa-gema', target: 'norm-ley2445', label: 'Riesgo Insolvencia / Remate' },
      { source: 'exp-santa-gema', target: 'norm-ley1579', label: 'Inscripción ORIP' },
      { source: 'exp-santa-gema', target: 'norm-ley45', label: 'Control Tasa Usura' },
      { source: 'exp-santa-gema', target: 'sent-sc3097', label: 'Precedente Indivisibilidad' },
      { source: 'norm-cc', target: 'sent-sc3097', label: 'Doctrina Vinculante' }
    ];

    setSelectedNode(nodes[0]); // Seleccionar por defecto el expediente

    const simulation = d3.forceSimulation<NodeDatum>(nodes)
      .force('link', d3.forceLink<NodeDatum, LinkDatum>(links).id(d => d.id).distance(130))
      .force('charge', d3.forceManyBody().strength(-350))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(d => (d as NodeDatum).radius! + 10));

    // Dibujar enlaces
    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', '#cbd5e1')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', 2);

    // Etiquetas de enlaces
    const linkText = g.append('g')
      .selectAll('text')
      .data(links)
      .join('text')
      .attr('class', 'text-[9px] font-bold fill-slate-400 uppercase tracking-tighter pointer-events-none')
      .text(d => d.label);

    // Dibujar nodos
    const node = g.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .call(d3.drag<SVGGElement, NodeDatum>()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        }))
      .on('click', (event, d) => {
        setSelectedNode(d);
      });

    // Círculos de los nodos
    node.append('circle')
      .attr('r', d => d.radius!)
      .attr('fill', d => d.color || '#6366f1')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 3)
      .attr('class', 'shadow-lg cursor-pointer transition-transform hover:scale-110');

    // Icono o texto inicial dentro del círculo
    node.append('text')
      .attr('dy', '0.35em')
      .attr('text-anchor', 'middle')
      .attr('class', 'text-[10px] font-black fill-white pointer-events-none')
      .text(d => d.category === 'expediente' ? 'EXP' : d.category === 'sentencia' ? 'CSJ' : 'LEY');

    // Etiquetas exteriores de los nodos
    node.append('text')
      .attr('x', 0)
      .attr('y', d => d.radius! + 16)
      .attr('text-anchor', 'middle')
      .attr('class', 'text-[11px] font-bold fill-slate-700 select-none')
      .text(d => d.name.length > 28 ? d.name.substring(0, 26) + '...' : d.name);

    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as NodeDatum).x!)
        .attr('y1', d => (d.source as NodeDatum).y!)
        .attr('x2', d => (d.target as NodeDatum).x!)
        .attr('y2', d => (d.target as NodeDatum).y!);

      linkText
        .attr('x', d => ((d.source as NodeDatum).x! + (d.target as NodeDatum).x!) / 2)
        .attr('y', d => ((d.source as NodeDatum).y! + (d.target as NodeDatum).y!) / 2 - 5);

      node
        .attr('transform', d => `translate(${d.x}, ${d.y})`);
    });

  }, []);

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 space-y-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 border border-indigo-200/80 px-2.5 py-0.5 rounded-full">
              Grafo Vectorial RAG & Knowledge Graph
            </span>
            <span className="text-xs text-slate-400 font-semibold">D3.js Force Simulation</span>
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Mapeo de Normas Colombianas vs. Expediente Activo
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Visualización interactiva de cómo las leyes sustantivas, procesales y precedentes de casación inciden en el caso **Hipoteca Santa Gema**.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-200">
          <Network className="w-4 h-4 text-indigo-600 animate-pulse" />
          <span>7 Nodos Conectados</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Contenedor del Grafo D3 */}
        <div 
          ref={containerRef} 
          className="lg:col-span-2 bg-slate-950 rounded-3xl border border-slate-800 relative overflow-hidden flex items-center justify-center min-h-[500px] shadow-inner"
        >
          <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/50 text-[10px] text-slate-300 font-bold">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></span>
            <span>Haga clic en cualquier nodo para ver el impacto jurídico</span>
          </div>

          <svg ref={svgRef} className="w-full h-full cursor-grab active:cursor-grabbing"></svg>
        </div>

        {/* Panel de Detalle del Nodo Seleccionado */}
        <div className="bg-slate-50 rounded-3xl p-6 border border-slate-200/80 space-y-5 flex flex-col justify-between min-h-[500px]">
          {selectedNode ? (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full ${
                  selectedNode.category === 'expediente' ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' :
                  selectedNode.category === 'sentencia' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                  'bg-teal-100 text-teal-700 border border-teal-200'
                }`}>
                  {selectedNode.category.toUpperCase()}
                </span>
                <span className="text-xs font-mono font-bold text-slate-400">ID: {selectedNode.id}</span>
              </div>

              <div>
                <h3 className="text-base font-black text-slate-900 leading-snug">{selectedNode.name}</h3>
                <p className="text-xs text-slate-600 mt-2 font-medium leading-relaxed">{selectedNode.description}</p>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-slate-200/80 space-y-2 shadow-sm">
                <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider">
                  <Info className="w-4 h-4" />
                  <span>Impacto sobre el Expediente</span>
                </div>
                <p className="text-xs text-slate-700 font-semibold leading-relaxed">
                  {selectedNode.impacto}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-20 text-slate-400 space-y-3">
              <Network className="w-10 h-10 mx-auto opacity-40" />
              <p className="text-xs font-bold uppercase tracking-wider">Seleccione un nodo en el grafo</p>
            </div>
          )}

          <div className="pt-4 border-t border-slate-200/80 text-[11px] text-slate-500 font-medium space-y-1">
            <p className="font-bold text-slate-700">Leyenda de Relaciones:</p>
            <p>• Líneas directas: Conexión sustancial y procesal vigente.</p>
            <p>• Motor vectorial: Vinculación con Neon DB y RAG.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
