/** Reprise de la file : toutes les 15 minutes, par l'app elle-même (aucune tâche planifiée à créer). */
export const RETRY_INTERVAL_MS = 15 * 60 * 1000;

type Timers = { setInterval: (fn: () => void, ms: number) => unknown };

/**
 * Lance `run` à intervalle régulier, jamais deux fois en même temps dans ce processus.
 * Entre deux conteneurs (bascule de déploiement), c'est `for update skip locked` qui
 * empêche de transmettre deux fois la même inscription.
 */
export function scheduleQueueRetry(run: () => Promise<unknown>, onError: (e: unknown) => void, timers: Timers = globalThis): void {
  let busy = false;
  timers.setInterval(() => {
    if (busy) return;
    busy = true;
    run()
      .catch(onError)
      .finally(() => {
        busy = false;
      });
  }, RETRY_INTERVAL_MS);
}
