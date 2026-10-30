"""Robi zrzuty ekranu do dokumentacji (docs/img). Wymaga: pip install playwright && playwright install chromium."""
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'docs' / 'img'
OUT.mkdir(parents=True, exist_ok=True)

def quiet(pg):
    pg.evaluate("document.getElementById('toast').classList.remove('show')")
    pg.wait_for_timeout(250)

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width': 1440, 'height': 900}, device_scale_factor=1)
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto((ROOT / 'index.html').as_uri())
    pg.wait_for_timeout(600)
    pg.screenshot(path=OUT / 'start-pusty.png')
    pg.evaluate("settings.userName='Kamil Komorowski';settings.company='Przewaga';settings.targetSet=true;render()")
    pg.click('[data-act="demo-quick"]')
    pg.evaluate("settings.onboardingHidden=true;render()")
    quiet(pg); pg.screenshot(path=OUT / 'pulpit.png')
    pg.click('[data-act="go"][data-page="pipeline"]'); quiet(pg); pg.screenshot(path=OUT / 'lejek-szans.png')
    pg.click('[data-act="pview"][data-v="lead"]'); quiet(pg); pg.screenshot(path=OUT / 'lejek-leadow.png')
    pg.click('[data-page="list"][data-obj="lead"]'); quiet(pg); pg.screenshot(path=OUT / 'lista-leadow.png')
    pg.evaluate("openRecord('lead','l6')"); quiet(pg); pg.screenshot(path=OUT / 'karta-leada.png', full_page=True)
    pg.evaluate("openRecord('deal','d3')"); quiet(pg); pg.screenshot(path=OUT / 'karta-szansy.png', full_page=True)
    pg.click('.search'); pg.keyboard.type('ka'); pg.wait_for_timeout(250); pg.screenshot(path=OUT / 'wyszukiwarka.png'); pg.keyboard.press('Escape')
    pg.click('[data-act="go"][data-page="analytics"]'); quiet(pg); pg.screenshot(path=OUT / 'analityka.png', full_page=True)
    pg.click('[data-act="aedit"]'); quiet(pg); pg.screenshot(path=OUT / 'analityka-uklad.png'); pg.click('[data-act="aedit"]')
    pg.evaluate("vc.open=true;vc.phase='listen';vc.listening=true;vc.text='Nowy lead Kwiaciarnia Róża z Krakowa, kontakt Anna Mazur,';vc.interim='właścicielka, telefon 501 300';renderVoice()")
    pg.wait_for_timeout(300); pg.screenshot(path=OUT / 'glos-nasluch.png')
    pg.evaluate("vc.text=VOICE_EX[0];vc.interim='';vc.listening=false"); pg.click('[data-act="vc-process"]'); pg.wait_for_timeout(300)
    pg.screenshot(path=OUT / 'glos-podglad.png'); pg.click('[data-act="vc-close"]')
    pg.evaluate("openRecord('lead','l2')"); pg.click('.rec-next [data-act="done"]'); pg.wait_for_timeout(250); pg.screenshot(path=OUT / 'nastepny-krok.png'); pg.click('[data-act="step-skip"]')
    pg.click('[data-act="go"][data-page="settings"]'); pg.click('[data-act="stab"][data-obj="stages"]'); quiet(pg); pg.screenshot(path=OUT / 'ustawienia-etapy.png')
    pg.click('[data-act="stab"][data-obj="team"]'); quiet(pg); pg.screenshot(path=OUT / 'ustawienia-zespol.png')
    b.close()
    print('Zapisano zrzuty w', OUT, '| błędy:', errs or 'brak')
