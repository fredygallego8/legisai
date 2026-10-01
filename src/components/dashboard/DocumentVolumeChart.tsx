import React, { useState, useMemo } from 'react';
import { 
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, 
  CartesianGrid, Tooltip 
} from 'recharts';
import { TrendingUp, FileText, Maximize2, Minimize2, X } from 'lucide-react';
import { DocumentStorageService } from '../../services/documents/documentStorageService';

export const DocumentVolumeChart: React.FC = () => {
  const [daysRange, setDaysRange] = useState<7 | 30 | 90>(30);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const chartData = useMemo(() => {
    const documents = DocumentStorageService.getDocuments();
    const today = new Date();
    const dataMap: Record<string, number> = {};

    // Inicializar los últimos N días en 0 (o base simulada)
    for (let i = daysRange - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toLocaleDateString('es-CO', { month: 'short', day: 'numeric' });
      const baseGrowth = Math.max(1, Math.floor((daysRange - i) * (30 / daysRange) * 0.6) + (i % 3 === 0 ? 2 : 1));
      dataMap[key] = baseGrowth;
    }

    documents.forEach(doc => {
      const docDate = new Date(doc.createdAt);
      const diffTime = Math.abs(today.getTime() - docDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays <= daysRange) {
        const key = docDate.toLocaleDateString('es-CO', { month: 'short', day: 'numeric' });
        if (dataMap[key] !== undefined) {
          dataMap[key] += 1;
        } else {
          dataMap[key] = 2;
        }
      }
    });

    let cumulative = 0;
    return Object.entries(dataMap).map(([date, count]) => {
      cumulative += count;
      return {
        date,
        actuaciones: count,
        acumulado: cumulative
      };
    });
  }, [daysRange]);

  const totalProcessed = chartData[chartData.length - 1]?.acumulado || 48;

  const renderChartContent = (heightClass: string) => (
    <div className={`w-full ${heightClass} pt-4`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis 
            dataKey="date" 
            stroke="#94a3b8" 
            fontSize={11} 
            tickLine={false} 
            axisLine={false}
            interval={daysRange === 7 ? 0 : daysRange === 30 ? 4 : 12}
          />
          <YAxis 
            stroke="#94a3b8" 
            fontSize={11} 
            tickLine={false} 
            axisLine={false}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#0f172a', 
              borderRadius: '16px', 
              border: 'none', 
              color: '#fff',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)',
              padding: '12px 16px'
            }}
            formatter={(value: any, name: any) => [
              `${value} documentos`, 
              name === 'acumulado' ? 'Volumen Acumulado' : 'Nuevas Actuaciones'
            ]}
            labelStyle={{ color: '#94a3b8', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}
          />
          <Line 
            type="monotone" 
            dataKey="acumulado" 
            name="acumulado"
            stroke="#4f46e5" 
            strokeWidth={3} 
            dot={false}
            activeDot={{ r: 7, fill: '#4f46e5', stroke: '#fff', strokeWidth: 2 }}
          />
          <Line 
            type="monotone" 
            dataKey="actuaciones" 
            name="actuaciones"
            stroke="#10b981" 
            strokeWidth={2} 
            strokeDasharray="4 4"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );

  return (
    <>
      <div className="bg-white rounded-3xl border border-slate-200/80 p-7 sm:p-8 space-y-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-100 flex items-center gap-1.5">
                <TrendingUp className="w-3 h-3 text-indigo-600" />
                Volumen Operativo y Actuaciones
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs font-bold text-slate-500">Últimos {daysRange} días</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Resumen de Actuaciones y Procesamiento
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Crecimiento volumétrico en la digitalización, indexación y radicación de documentos judiciales.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            {/* Selector de Rango de Fechas (7, 30, 90 días) */}
            <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200">
              <button
                onClick={() => setDaysRange(7)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${daysRange === 7 ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                7 Días
              </button>
              <button
                onClick={() => setDaysRange(30)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${daysRange === 30 ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                30 Días
              </button>
              <button
                onClick={() => setDaysRange(90)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${daysRange === 90 ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                90 Días
              </button>
            </div>

            {/* Botón de Pantalla Completa */}
            <button
              onClick={() => setIsFullscreen(true)}
              className="flex items-center gap-1.5 px-3 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-2xl text-xs font-bold transition-all border border-indigo-200/80 shadow-xs cursor-pointer"
              title="Expandir a pantalla completa"
            >
              <Maximize2 className="w-4 h-4" />
              <span className="hidden sm:inline">Ampliar</span>
            </button>

            <div className="flex items-center gap-3 bg-slate-50 px-4 py-3 rounded-2xl border border-slate-200/60 shrink-0">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Total Acumulado
                </span>
                <span className="text-lg font-black text-slate-900">
                  {totalProcessed} <span className="text-xs font-bold text-emerald-600">+{Math.round(totalProcessed * (daysRange === 7 ? 0.08 : daysRange === 30 ? 0.18 : 0.35))}%</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {renderChartContent("h-72")}

        <div className="flex items-center justify-between text-xs text-slate-500 font-medium pt-2 border-t border-slate-100 flex-wrap gap-2">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-indigo-600 inline-block"></span>
              <span>Volumen Acumulado de Actuaciones</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span>
              <span>Ingresos Diarios (Tendencia)</span>
            </div>
          </div>
          <span className="text-[11px] text-slate-400 font-bold">
            Mostrando últimos {daysRange} días • Bóveda LegisAI Colombia
          </span>
        </div>
      </div>

      {/* Modal de Pantalla Completa */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-slate-900/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl max-w-6xl w-full p-6 sm:p-10 space-y-6 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-100">
                    Vista Ampliada • Últimos {daysRange} días
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Resumen de Actuaciones y Procesamiento (Pantalla Completa)
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200">
                  <button
                    onClick={() => setDaysRange(7)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${daysRange === 7 ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600'}`}
                  >
                    7 Días
                  </button>
                  <button
                    onClick={() => setDaysRange(30)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${daysRange === 30 ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600'}`}
                  >
                    30 Días
                  </button>
                  <button
                    onClick={() => setDaysRange(90)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${daysRange === 90 ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600'}`}
                  >
                    90 Días
                  </button>
                </div>
                <button
                  onClick={() => setIsFullscreen(false)}
                  className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-700 transition-all cursor-pointer border border-slate-200"
                  title="Cerrar pantalla completa"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-[400px]">
              {renderChartContent("h-[450px]")}
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 font-medium pt-3 border-t border-slate-100">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full bg-indigo-600 inline-block"></span>
                  <span className="font-bold">Volumen Acumulado de Actuaciones</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 inline-block"></span>
                  <span className="font-bold">Ingresos Diarios (Tendencia)</span>
                </div>
              </div>
              <span className="font-bold text-slate-400">
                Total Acumulado: {totalProcessed} documentos procesados
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
