// Seria powitalna: mail zaraz po założeniu firmy, w dniu 2 i w dniu 5. Każdy krok wychodzi raz.
// Treść zależy od tego, co firma już zrobiła: bez danych podpowiadamy import, bez zespołu zaproszenia.
import type { FastifyInstance } from 'fastify';
import { layout } from './mail.js';
import { now } from './security.js';

async function once(app: FastifyInstance, userId: string, step: string, send: () => Promise<boolean>) {
  if (await app.db.one('SELECT 1 AS x FROM onboarding_mails WHERE user_id = ? AND step = ?', [userId, step])) return false;
  await app.db.run('INSERT INTO onboarding_mails (user_id, step, sent_at) VALUES (?, ?, ?)', [userId, step, now()]);
  return send();
}
const first = (name: string) => String(name || '').split(/\s+/)[0];

export async function sendWelcome(app: FastifyInstance, u: { id: string; email: string; name: string }, org: string) {
  if (!app.cfg.onboardingMails) return false;
  return once(app, u.id, 'welcome', () => app.mail.send({
    to: u.email, subject: `Witaj w Hermesie, ${first(u.name)}`,
    ...layout([
      `Cześć ${first(u.name)}, konto firmy ${org} jest gotowe.`,
      'Na start trzy kroki, każdy zajmie kilka minut:',
      '1. Wgraj leady i szanse: z pliku CSV albo prosto z eksportu Pipedrive, HubSpot lub Livespace.',
      '2. Ustaw cel sprzedaży na miesiąc, żeby Hermes liczył postęp i prognozę.',
      '3. Zaproś zespół w Ustawieniach, w zakładce Zespół.',
      'Każdy otwarty lead i szansa mają w Hermesie następny krok. Rano dostaniesz plan dnia z tym, co czeka.'
    ], { label: 'Otwórz Hermesa', url: app.cfg.publicUrl + '/' }, 'Masz pytanie? Odpowiedz na tę wiadomość.')
  }));
}

export async function runOnboarding(app: FastifyInstance, at = new Date()) {
  if (!app.cfg.onboardingMails) return 0;
  const { db, cfg } = app;
  const admins = await db.all(`SELECT u.id, u.email, u.name, u.created_at, m.org_id, o.name AS org_name FROM memberships m
    JOIN users u ON u.id = m.user_id JOIN orgs o ON o.id = m.org_id WHERE m.role = 'admin' AND u.created_at > ?`, [new Date(at.getTime() - 14 * 864e5).toISOString()]);
  let sent = 0;
  for (const a of admins) {
    const age = (at.getTime() - Date.parse(a.created_at)) / 864e5;
    const count = async (type: string) => Number((await db.one('SELECT COUNT(*) AS n FROM records WHERE org_id = ? AND type = ? AND deleted = 0', [a.org_id, type]))?.n || 0);
    if (age >= 2 && age < 10) {
      const deals = await count('deal') + await count('lead');
      if (await once(app, a.id, 'day2', () => app.mail.send({
        to: a.email, subject: deals ? 'Niech leady same wpadają do Hermesa' : 'Twój lejek jest jeszcze pusty',
        ...layout(deals ? [
          `${first(a.name)}, masz już ${deals} ${deals === 1 ? 'rekord' : 'rekordy lub więcej'} w lejku. Teraz zadbaj, żeby kolejne wpisywały się same:`,
          '• Formularz na stronę (Ustawienia, Ogólne) tworzy leada z każdego zapytania.',
          '• Adres BCC zapisuje Twoje maile do klientów w ich historii.',
          '• Dane firmy po NIP uzupełnisz jednym kliknięciem przy dodawaniu firmy.'
        ] : [
          `${first(a.name)}, w Hermesie nie ma jeszcze leadów ani szans.`,
          'Najszybciej: wyeksportuj szanse z obecnego CRM albo arkusza i wgraj plik. Hermes rozpozna kolumny z Pipedrive, HubSpot i Livespace, a etapy przypiszesz w jednym oknie.',
          'Wolisz zacząć od zera? Dodaj pierwszego leada głosem: kliknij mikrofon przy przycisku dodawania i opowiedz o kliencie.'
        ], { label: deals ? 'Otwórz Ustawienia' : 'Dodaj pierwsze dane', url: cfg.publicUrl + '/' })
      }))) sent++;
    }
    if (age >= 5 && age < 12) {
      const team = Number((await db.one('SELECT COUNT(*) AS n FROM memberships WHERE org_id = ?', [a.org_id]))?.n || 0);
      if (await once(app, a.id, 'day5', () => app.mail.send({
        to: a.email, subject: team > 1 ? 'Jak idzie sprzedaż w zespole?' : 'Sprzedajesz z kimś? Zaproś zespół',
        ...layout(team > 1 ? [
          `${first(a.name)}, w ${a.org_name} pracuje już ${team} osób.`,
          'W Analityce wybierz opiekuna, żeby zobaczyć wyniki każdej osoby względem jej celu. Rola Podgląd przyda się księgowej albo wspólnikowi, który tylko patrzy.',
          'Hermes AI odpowie na pytanie „Które szanse są zagrożone?” w kilka sekund.'
        ] : [
          `${first(a.name)}, Hermes działa najlepiej, gdy cały zespół pracuje na jednym lejku.`,
          'W Ustawieniach, w zakładce Zespół, zaprosisz handlowca, wspólnika albo księgową. Każdy dostanie rolę i zobaczy tylko to, co powinien.',
          'Każdy rano dostaje własny plan dnia, a Ty widzisz, czy żaden klient nie został bez następnego kroku.'
        ], { label: 'Otwórz Hermesa', url: cfg.publicUrl + '/' })
      }))) sent++;
    }
  }
  return sent;
}
