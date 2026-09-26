'use client';

import { CalendarCheck2, CalendarDays, Phone, UserRound } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ptBR } from 'date-fns/locale';

import { Calendar } from '@/components/ui/calendar';
import type { CompanyDashboardData, CompanyTraining, TrainingSession } from '@/lib/company-types';

function dateFromIso(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}

function isoFromDate(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function longDate(iso: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  }).format(dateFromIso(iso));
}

export function CompanyAvailability({ data }: { data: CompanyDashboardData }) {
  const [selected, setSelected] = useState<Date | undefined>(undefined);

  // Uma data pode ter vários instrutores; o mapa evita varrer a lista a cada clique.
  const byDate = useMemo(() => {
    const map = new Map<string, typeof data.instructorAvailability>();
    for (const item of data.instructorAvailability) {
      const current = map.get(item.available_date) ?? [];
      current.push(item);
      map.set(item.available_date, current);
    }
    return map;
  }, [data.instructorAvailability]);

  const availableDates = useMemo(
    () => [...byDate.keys()].map(dateFromIso),
    [byDate],
  );

  // Todos os dias de cada turma, não só o primeiro: turma de 3 dias ocupa 3 datas.
  const diasPorData = useMemo(() => {
    const map = new Map<string, { training: CompanyTraining; session: TrainingSession; total: number }[]>();
    for (const training of data.trainings) {
      const dias = training.sessions ?? [];
      for (const session of dias) {
        const current = map.get(session.session_date) ?? [];
        current.push({ training, session, total: dias.length });
        map.set(session.session_date, current);
      }
    }
    return map;
  }, [data.trainings]);

  const trainingDates = useMemo(() => [...diasPorData.keys()].map(dateFromIso), [diasPorData]);

  const selectedIso = selected ? isoFromDate(selected) : '';
  const onSelectedDate = selectedIso ? byDate.get(selectedIso) ?? [] : [];
  const trainingsOnDate = selectedIso ? diasPorData.get(selectedIso) ?? [] : [];

  const instructorById = useMemo(
    () => new Map(data.instructors.map((instructor) => [instructor.id, instructor])),
    [data.instructors],
  );

  const upcoming = useMemo(() => {
    const today = isoFromDate(new Date());
    return [...byDate.entries()]
      .filter(([iso]) => iso >= today)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(0, 6);
  }, [byDate]);

  return <section className="rounded-lg border border-ds-borda bg-ds-superficie p-5 md:p-7">
    <span className="eyebrow text-ds-amarelo-texto">Agenda informada</span>
    <h2 className="mt-2 ds-h4">Quem está disponível</h2>
    <p className="mt-2 max-w-2xl text-xs leading-relaxed text-ds-texto-2">Clique em uma data para ver os instrutores que se declararam disponíveis nela.</p>

    <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,.85fr)_minmax(0,1.15fr)]">
      <div>
        <Calendar
          mode="single"
          selected={selected}
          onSelect={setSelected}
          locale={ptBR}
          modifiers={{ available: availableDates, training: trainingDates }}
          modifiersClassNames={{
            available: 'ring-2 ring-ds-amarelo ring-inset font-bold',
            training: 'bg-black text-ds-amarelo font-bold',
          }}
          className="mx-auto w-full [--cell-size:--spacing(11)]"
        />
        <div className="mt-4 flex flex-wrap gap-4 border-t border-ds-borda pt-4 ds-caps text-ds-texto-2">
          <span className="flex items-center gap-2"><i className="size-3 border-2 border-ds-amarelo" />Instrutor disponível</span>
          <span className="flex items-center gap-2"><i className="size-3 bg-black" />Treinamento marcado</span>
        </div>
      </div>

      <div className="min-w-0">
        {!selected ? <div className="rounded-lg border border-dashed border-ds-borda p-5">
          <div className="flex items-start gap-3">
            <CalendarDays className="mt-0.5 size-5 shrink-0 text-ds-amarelo-texto" />
            <p className="text-xs leading-relaxed text-ds-texto-2">Selecione um dia no calendário. Os dias com contorno amarelo têm pelo menos um instrutor disponível.</p>
          </div>
          {upcoming.length ? <div className="mt-5">
            <span className="ds-caps text-ds-texto-2">Próximas datas com disponibilidade</span>
            <ul className="mt-3 space-y-2">{upcoming.map(([iso, items]) => <li key={iso}>
              <button type="button" onClick={() => setSelected(dateFromIso(iso))} className="flex w-full items-center justify-between gap-3 border border-ds-borda px-4 py-3 text-left text-xs transition hover:border-ds-amarelo hover:bg-ds-amarelo-suave">
                <span className="font-bold capitalize">{longDate(iso)}</span>
                <span className="shrink-0 bg-ds-amarelo-suave px-2 py-1 ds-caps text-ds-amarelo-texto">{items.length} instrutor{items.length > 1 ? 'es' : ''}</span>
              </button>
            </li>)}</ul>
          </div> : <p className="mt-5 text-xs text-ds-texto-2">Nenhum instrutor informou disponibilidade ainda.</p>}
        </div> : <div>
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-ds-borda pb-3">
            <strong className="text-sm font-extrabold uppercase capitalize tracking-[0.08em]">{longDate(selectedIso)}</strong>
            <span className="ds-caps text-ds-texto-2">{onSelectedDate.length} disponível(is)</span>
          </div>

          {trainingsOnDate.length ? <div className="mt-4 border-l-4 border-black bg-ds-muted p-4">
            <span className="ds-caps text-ds-texto-2">Já marcado neste dia</span>
            <ul className="mt-2 space-y-1 text-xs">{trainingsOnDate.map(({ training, session, total }) => <li key={session.id}><strong>{training.nr}</strong> · {training.internal_label || training.title}{total > 1 ? ` (dia ${session.day_number} de ${total})` : ''} — {training.client_name} <span className="text-ds-texto-2">({session.instructor_name ?? 'sem instrutor'})</span></li>)}</ul>
          </div> : null}

          {onSelectedDate.length ? <ul className="mt-4 space-y-3">{onSelectedDate.map((item) => {
            const instructor = instructorById.get(item.instructor_id);
            return <li key={item.id} className="flex items-start gap-4 border border-ds-borda p-4">
              <span className="rounded-md flex size-11 shrink-0 items-center justify-center bg-ds-amarelo-suave text-ds-amarelo-texto"><UserRound className="size-5" /></span>
              <div className="min-w-0 flex-1">
                <strong className="block ds-body-s font-semibold">{item.instructor_name}</strong>
                {instructor?.specialties ? <p className="mt-1 text-[11px] font-bold text-ds-amarelo-texto">{instructor.specialties}</p> : null}
                <p className="mt-1 text-xs text-ds-texto-2">{item.note || 'Disponível para novas turmas'}</p>
                {instructor?.phone ? <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-ds-texto-2"><Phone className="size-3.5" />{instructor.phone}</p> : null}
              </div>
            </li>;
          })}</ul> : <div className="rounded-lg mt-4 flex min-h-40 flex-col items-center justify-center border border-dashed border-ds-borda p-6 text-center">
            <CalendarCheck2 className="size-6 text-ds-amarelo-texto" />
            <strong className="mt-3 text-xs uppercase tracking-[0.1em]">Ninguém disponível nesta data</strong>
            <p className="mt-1 max-w-xs text-xs leading-relaxed text-ds-texto-2">Nenhum instrutor marcou este dia. Escolha outra data ou fale diretamente com a equipe.</p>
          </div>}
        </div>}
      </div>
    </div>
  </section>;
}
