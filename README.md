# PumpkinLab

Een vrolijk-griezelig browserspel voor kinderen van ongeveer 12 jaar. Je loopt rond in een
Halloween-laboratorium (schuin van boven gezien), slaat pompoenen kapot met je knuppel en raapt
de muntjes op. Maar pas op: uit sommige pompoenen klimt een skelet, een zombie of een geest!

- Elk level heeft 3 kamers met veel pompoenen: in level 1 zijn het er 10, 12 en 14, en elk level
  komen er meer bij (hooguit 30). Zijn alle pompoenen kapot en alle skeletten en zombies uit de
  pompoenen verslagen, dan gaat de deur open.
- Elke 5 tot 10 seconden (op *Normaal*) klimt er vanzelf een monster uit de vloer: meestal een
  zombie, soms een skelet en vanaf level 2 af en toe een geest. Deze monsters houden de deur niet
  dicht: je mag ze ook laten staan en door de deur rennen.
- Na elke kamer en elk level kom je in de winkel, met vier afdelingen:
  - **Knuppels**: steen, ijzer, goud en vanaf level 8 de diamanten knuppel (pompoen in 1 klap).
  - **Upgrades** (voor altijd): snelle schoenen, snelle zwaai, lange arm (verder slaan),
    geluksklaver (meer munten per pompoen), extra hartje (tot 7) en een extra
    dierplek (4e plek vanaf level 7, 5e vanaf level 12).
  - **Dieren**: maak je dieren sterker (niveau 1 → 2 → 3).
  - **Hartjes**: een verloren hartje bijvullen.

  Wat nog op slot zit, zie je al met een slotje en "Vanaf level X".
- Een knuppel uit een pompoen maakt je knuppel één stap beter, alleen voor dat level en hooguit
  tot goud.
- Na level 1 krijg je de wolf, daarna bij elk level een nieuw dier (hond, beer, kat, uil,
  vleermuis, schildpad, egel, raaf). Je neemt er 3 mee per kamer, met upgrades 4 of 5.
- Geesten kun je alleen raken nadat de wolf heeft gehuild.
- Hartjes op? Dan begin je het level opnieuw en ben je de muntjes van dat level kwijt.
- Na 5 levels heb je gewonnen; daarna kun je eindeloos doorspelen.
- Nederlands en Engels, drie muziekjes (muziek en geluidseffecten los aan/uit te zetten), voortgang
  wordt automatisch bewaard (localStorage).

Alles (graphics en geluid) wordt in code gemaakt. Er zijn geen libraries, geen plaatjes of
geluidsbestanden en geen build-stap nodig.

## Starten

Het spel gebruikt ES-modules, dus het moet via een (lokale) webserver draaien; het HTML-bestand
direct openen werkt niet.

**macOS:** dubbelklik `start.command`. Er opent een Terminal-venster met de server en het spel
opent in je browser. Sluit het venster om te stoppen. (Mag het de eerste keer niet openen? Klik
dan met de rechtermuisknop op het bestand en kies *Open*.)

**Met de hand** (elk systeem met Python 3), in deze map:

```sh
python3 -m http.server 8000
```

Open daarna http://localhost:8000 in de browser.

Spelen op een tablet of telefoon in hetzelfde wifi-netwerk: start de server met
`python3 -m http.server 8000 --bind 0.0.0.0` en open `http://<ip-adres-van-je-computer>:8000`.

## Besturing

| Actie | Toetsenbord | Touch (tablet/telefoon) |
|---|---|---|
| Lopen | pijltjestoetsen of W A S D | joystick links onder |
| Slaan | spatie, Z of J | knop *Slaan* rechts onder (ingedrukt houden = blijven slaan) |
| Pauze | Esc of P | pauzeknop rechts boven |
| Menu's | pijltjes + Enter/spatie, Esc = terug | tikken |

De muis werkt overal in de menu's. Instellingen (taal, moeilijkheid, liedje, volume) vind je in
het titelscherm en in het pauzemenu. Daar staan ook twee schakelaars: **Muziek aan/uit** en
**Geluidseffecten aan/uit**. Ze worden onthouden, ook als je het spel later opnieuw opent.

## Bestanden

```
index.html            pagina met het canvas en de UI-laag
style.css             opmaak van alle menu's, HUD, toasts en touch-knoppen
DESIGN.md             spelregels en afspraken tussen de modules
start.command         macOS-starter (server + browser)
src/
  config.js           alle spelgetallen (balans, levels, dieren, knuppels, upgrades, spawner)
  main.js             start alles op; window.pompoenlab = engine (handig om te debuggen)
  game/
    engine.js         hoofdlus en spelverloop (titel, levels, kamers, winkel, game over)
    world.js          simulatie van één kamer: speler, slaan, munten, deur, monsters die vanzelf verschijnen
    room.js           maakt een kamer (pompoenen, obstakels, muurdecor)
    draw.js           tekent de wereld (y-gesorteerd, schaduwen, effecten)
    screen.js         canvasgrootte, letterboxing en scherpte op retina-schermen
    input.js          toetsenbord + touch samengevoegd
    monsters.js       skelet, zombie en geest (gedrag)
    pets.js           de 9 dieren (gedrag en bonussen)
  render/
    sprites.js        ingang voor alle tekenfuncties + iconen voor de UI
    art-room.js       vloer, muren, deur, muurdecor
    art-actors.js     speler, knuppels, monsters
    art-pets.js       dieren
    art-props.js      pompoenen, obstakels, munten
    art-fx.js         effecten (scherven, sterretjes, gehuil, ...)
    art-util.js       gedeelde tekenhulpjes
  ui/
    ui.js             alle schermen, HUD, toasts en touch-besturing
    i18n.js           teksten in het Nederlands en Engels
    save.js           opslaan en laden van voortgang en instellingen
    shop.js           winkel-artikelen (knuppels, upgrades, dieren, hartjes) en kopen
  audio/
    audio.js          WebAudio: muziek en geluidseffecten (API voor de rest van het spel)
    music.js          de drie muziekjes
    sfx.js            de geluidseffecten
    synth.js          synthesizer-bouwstenen
```
