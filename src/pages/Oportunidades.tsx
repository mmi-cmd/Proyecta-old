import { useMemo, useState } from 'react'
import { ExternalLink, FilterX, Loader2, Sparkles, X } from 'lucide-react'
import { useDatos } from '@/hooks/useDatos'
import { buscarSemantico } from '@/lib/colaboracion'
import { apiHabilitada } from '@/lib/http'
import { AREAS, ODS, TIPOS_OPORTUNIDAD, type Area, type RespuestaSugerencias, type TipoOportunidad } from '@/lib/types'
import { NotaMetodo } from '@/components/Sugerencias'
import { Badge, EmptyState, Skeleton } from '@/components/ui'
import { diasRestantes, formatCompactCOP, formatDate } from '@/lib/format'

const TIPO_CLASS: Record<string, string> = {
  convocatoria: 'bg-brand-100 text-brand-800 dark:bg-brand-500/15 dark:text-brand-300',
  financiacion: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
  mentoria: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
  infraestructura: 'bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300',
}

const TIPO_LABEL: Record<TipoOportunidad, string> = {
  convocatoria: 'Convocatoria',
  financiacion: 'Financiación',
  mentoria: 'Mentoría',
  infraestructura: 'Infraestructura',
}

export function Oportunidades() {
  const { oportunidades, cargando } = useDatos()
  const [consulta, setConsulta] = useState('')
  const [busqueda, setBusqueda] = useState<RespuestaSugerencias | null>(null)
  const [buscando, setBuscando] = useState(false)
  const [error, setError] = useState('')

  // Filtros en pantalla
  const [soloAbiertas, setSoloAbiertas] = useState(true)
  const [tipoFiltro, setTipoFiltro] = useState<TipoOportunidad | ''>('')
  const [areaFiltro, setAreaFiltro] = useState<Area | ''>('')
  const [odsFiltro, setOdsFiltro] = useState<number | ''>('')

  const buscar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (consulta.trim().length < 3) return
    setBuscando(true)
    setError('')
    try {
      setBusqueda(await buscarSemantico(consulta.trim()))
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBuscando(false)
    }
  }

  const limpiarFiltros = () => {
    setSoloAbiertas(true)
    setTipoFiltro('')
    setAreaFiltro('')
    setOdsFiltro('')
    setBusqueda(null)
    setConsulta('')
  }

  const filtrosActivos = !soloAbiertas || tipoFiltro !== '' || areaFiltro !== '' || odsFiltro !== ''

  const hoy = new Date().toISOString().slice(0, 10)

  const visibles = useMemo(() => {
    const relevancia = new Map(busqueda?.resultados.map((r) => [r.id, r.similitud]))

    let base = busqueda
      ? oportunidades.filter((o) => relevancia.has(o.id)).sort((a, b) => relevancia.get(b.id)! - relevancia.get(a.id)!)
      : [...oportunidades].sort((a, b) => a.cierra_en.localeCompare(b.cierra_en))

    return base.filter((o) => {
      if (soloAbiertas && o.cierra_en < hoy) return false
      if (tipoFiltro && o.tipo !== tipoFiltro) return false
      if (areaFiltro && !o.areas.includes(areaFiltro)) return false
      if (odsFiltro && !o.ods?.includes(Number(odsFiltro))) return false
      return true
    })
  }, [oportunidades, busqueda, soloAbiertas, tipoFiltro, areaFiltro, odsFiltro, hoy])

  const relevancia = new Map(busqueda?.resultados.map((r) => [r.id, r.similitud]))

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">Oportunidades de apoyo</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {cargando ? 'Cargando…' : `${visibles.length} de ${oportunidades.length} oportunidades disponibles`}
          </p>
        </div>
      </header>

      {apiHabilitada && (
        <form onSubmit={buscar} className="card p-4">
          <label htmlFor="busqueda-semantica" className="label flex items-center gap-1.5">
            <Sparkles size={13} aria-hidden /> Describe lo que buscas con tus palabras
          </label>
          <div className="flex gap-2">
            <input
              id="busqueda-semantica"
              className="input"
              placeholder="Ej.: dinero para un piloto de agua potable en zona rural"
              value={consulta}
              onChange={(e) => setConsulta(e.target.value)}
            />
            <button className="btn-primary shrink-0" disabled={buscando}>
              {buscando ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <Sparkles size={15} aria-hidden />}
              Buscar
            </button>
            {busqueda && (
              <button type="button" className="btn-ghost shrink-0" onClick={() => { setBusqueda(null); setConsulta('') }}>
                <X size={15} aria-hidden /> Ver todas
              </button>
            )}
          </div>
          {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
          {busqueda && (
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              {busqueda.resultados.length} oportunidad(es) relacionadas encontradas por relevancia semántica.
            </p>
          )}
          <NotaMetodo metodo={busqueda?.metodo} />
        </form>
      )}

      {/* Barra de filtros */}
      <div className="card flex flex-wrap items-end gap-3 p-4">
        <div className="w-full sm:w-44">
          <label className="label" htmlFor="f-tipo">Tipo</label>
          <select
            id="f-tipo"
            className="input"
            value={tipoFiltro}
            onChange={(e) => setTipoFiltro(e.target.value as TipoOportunidad | '')}
          >
            <option value="">Todos los tipos</option>
            {TIPOS_OPORTUNIDAD.map((t) => (
              <option key={t} value={t}>{TIPO_LABEL[t]}</option>
            ))}
          </select>
        </div>

        <div className="w-full sm:w-44">
          <label className="label" htmlFor="f-area">Área</label>
          <select
            id="f-area"
            className="input"
            value={areaFiltro}
            onChange={(e) => setAreaFiltro(e.target.value as Area | '')}
          >
            <option value="">Todas las áreas</option>
            {AREAS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>

        <div className="w-full sm:w-56">
          <label className="label" htmlFor="f-ods">ODS</label>
          <select
            id="f-ods"
            className="input"
            value={odsFiltro}
            onChange={(e) => setOdsFiltro(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">Todos los ODS</option>
            {ODS.map((o) => (
              <option key={o.id} value={o.id}>ODS {o.id}. {o.nombre}</option>
            ))}
          </select>
        </div>

        <div className="flex h-10 items-center gap-2 px-1">
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-900"
              checked={soloAbiertas}
              onChange={(e) => setSoloAbiertas(e.target.checked)}
            />
            Solo abiertas
          </label>
        </div>

        {filtrosActivos && (
          <button
            type="button"
            className="btn-ghost flex h-10 items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            onClick={limpiarFiltros}
          >
            <FilterX size={14} aria-hidden /> Restablecer filtros
          </button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {cargando ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-44" />)
        ) : visibles.length === 0 ? (
          <div className="col-span-full">
            <EmptyState
              titulo="No se encontraron oportunidades"
              detalle="Prueba cambiando los filtros seleccionados o desmarcando 'Solo abiertas'."
              accion={
                filtrosActivos ? (
                  <button type="button" className="btn-secondary" onClick={limpiarFiltros}>
                    Limpiar filtros
                  </button>
                ) : undefined
              }
            />
          </div>
        ) : (
          visibles.map((o) => {
            const dias = diasRestantes(o.cierra_en)
            const cerrada = dias < 0
            return (
              <article key={o.id} className="card flex flex-col gap-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-semibold text-slate-900 dark:text-white">{o.titulo}</h2>
                  <div className="flex shrink-0 gap-1.5">
                    {relevancia.has(o.id) && (
                      <Badge className="bg-accent-100 text-accent-800 dark:bg-accent-500/15 dark:text-accent-300">
                        {Math.round(relevancia.get(o.id)! * 100)}% relevante
                      </Badge>
                    )}
                    <Badge className={TIPO_CLASS[o.tipo]}>{TIPO_LABEL[o.tipo] ?? o.tipo}</Badge>
                    {cerrada && (
                      <Badge className="bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400">
                        Cerrada
                      </Badge>
                    )}
                  </div>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">{o.entidad}</p>

                <div className="flex flex-wrap gap-1.5">
                  {o.areas.map((a) => (
                    <span key={a} className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                      {a}
                    </span>
                  ))}
                  {o.ods?.map((odsId) => (
                    <span key={odsId} className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                      ODS {odsId}
                    </span>
                  ))}
                </div>

                <dl className="mt-auto grid grid-cols-2 gap-3 border-t border-slate-200 pt-3 text-sm dark:border-slate-800">
                  <div>
                    <dt className="label">Monto</dt>
                    <dd className="text-slate-700 tabular-nums dark:text-slate-300">
                      {o.monto ? formatCompactCOP(o.monto) : 'En especie'}
                    </dd>
                  </div>
                  <div>
                    <dt className="label">Cierre</dt>
                    <dd className={cerrada ? 'text-slate-400 dark:text-slate-500' : dias <= 30 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}>
                      {formatDate(o.cierra_en)} {cerrada ? '(cerró)' : `(${dias}d)`}
                    </dd>
                  </div>
                </dl>

                <a
                  href={o.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline dark:text-brand-400"
                >
                  Ver detalles <ExternalLink size={14} aria-hidden />
                </a>
              </article>
            )
          })
        )}
      </div>
    </div>
  )
}
