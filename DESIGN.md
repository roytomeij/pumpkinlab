# PumpkinLab: ontwerp en module-afspraken

Webspel voor kinderen van ongeveer 12 jaar. Een eigen ontwerp: alleen het *perspectief* (2D, schuin van boven, 3/4-aanzicht) is geïnspireerd op een referentieplaatje. Neem geen personages, stijl of UI van bestaande games over.

Plain HTML/CSS/JS met ES-modules, **geen build-stap en geen externe libraries of assets**. Alle graphics worden in code getekend (Canvas 2D), alle audio met WebAudio gegenereerd. Draaien: `python3 -m http.server 8000` in de projectmap, daarna http://localhost:8000.

## Spelregels (samenvatting)
- Je bent een poppetje in een Halloween-laboratorium. Een **level** heeft 3 **kamers**. Er zijn 5 verhaallevels, daarna een overwinningsscherm met de optie om eindeloos door te spelen (level 6+, steeds moeilijker). Zo kun je alle dieren verzamelen.
- In elke kamer staan pompoenen (+ obstakels). Pompoenen sla je kapot met je knuppel. Pompoen-hp 60, knuppelschade staat in `CLUBS`: hout 5 slagen, steen 4, ijzer 3, goud 2.
- Een kapotte pompoen geeft (kansen in `DROP_BASE`, aangepast door moeilijkheid/hond/uil):
  - **munt**: muntjes vallen op de grond en moet je oprapen.
  - **knuppel**: oppakbaar item, +1 knuppelniveau **alleen voor dit level** (max goud; al goud → geeft munten).
  - **monster**: klimt eruit (0,6 s ongevaarlijk). Skelet = 1 klap. Zombie = hp 36 (3 klappen met hout). Geest = alleen te raken als hij "onthuld" is door het gehuil van de wolf, dan 1 klap. Zonder wolf kun je een geest niet raken.
- Inhoud van een pompoen wordt bepaald **bij het maken van de kamer** (zodat de kat het kan tonen).
- De **deur** (midden van de achtermuur) gaat open als alle pompoenen kapot zijn en alle skeletten/zombies dood zijn. Geesten blokkeren de deur niet. Loop door de open deur → kamer klaar (+`roomClearBonus`).
- **Hartjes**: 5. Aanraking van een monster = −1 (daarna 1 s onkwetsbaar). Op 0 → game over → level opnieuw vanaf kamer 1. Je verliest het geld dat je *in dit level* hebt verdiend en de tijdelijke knuppel. Geld van vóór het level en alle aankopen houd je. Hartjes worden aan het begin van elk level weer 5.
- **Winkel** na elke kamer en na elk level: knuppels (permanent), dier-upgrades (level 1→2→3), +1 hartje. Betalen gaat eerst met `run.levelCoins`, daarna met `profile.bankCoins`.
- **Dieren**: na level 1 krijg je altijd de wolf. Na elk volgend level krijg je een willekeurig dier dat je nog niet hebt (heb je ze allemaal: bonusmunten). **Vóór elke kamer** kies je max. 3 dieren die meegaan (scherm wordt overgeslagen als je nog geen dieren hebt).
  - wolf: huilt **vanzelf** als er een geest binnen `howlRadius` is en de cooldown klaar is. Geesten in de buurt worden "onthuld" (`state='revealed'`): ze worden teruggeduwd, staan stil, zijn ondoorzichtig en kunnen `revealTime` s lang met 1 klap verslagen worden.
  - dog: meer kans op munt (procentpunten van monster naar munt; L1 → 40/50/10).
  - bear: loopt naar zombies/skeletten binnen `attackRadius` en slaat ze (`damage`, `cooldown`).
  - cat: toont boven pompoenen binnen `revealRadius` een icoontje van de inhoud (munt/monster/knuppel).
  - owl: meer kans op knuppel (procentpunten van monster naar knuppel).
  - bat (vleermuis): vliegt naar de dichtstbijzijnde pompoen en doet `pumpkinDamage` per `cooldown`.
  - turtle: `shields` schildjes per kamer, die elk een klap opvangen.
  - hedgehog: een monster dat jou raakt krijgt `spikeDamage`; een skelet breekt meteen.
  - raven: trekt munten aan binnen `magnetRadius`, met `doubleChance` op dubbele waarde.
- Moeilijkheid (`DIFFICULTY`): monstersnelheid en een verschuiving tussen munt en monster.
- Talen: NL en EN. Drie achtergrondmuziekjes om uit te kiezen. Instellingen en voortgang staan in localStorage.

## Bestanden en eigenaars
Elke agent werkt **alleen in zijn eigen bestanden**. Eigen helperbestanden in de eigen map mogen.

| Bestand | Eigenaar |
|---|---|
| `index.html`, `src/config.js`, `DESIGN.md` | coördinator (niet wijzigen; ontbreekt er iets, meld het in je eindrapport) |
| `src/main.js`, `src/game/engine.js`, `src/game/input.js`, `src/game/room.js` (+ helpers in `src/game/`, behalve de twee hieronder) | **Engine** |
| `src/game/monsters.js`, `src/game/pets.js` | **Entities** |
| `src/render/sprites.js` (+ helpers in `src/render/`) | **Art** |
| `src/ui/ui.js`, `src/ui/i18n.js`, `src/ui/save.js`, `src/ui/shop.js`, `style.css` | **UI** |
| `src/audio/audio.js` | **Audio** |

## Coördinaten en tekenen
- Logische wereld is 1024×640 (`WORLD`). De engine schaalt het canvas met letterboxing naar het venster (houdt rekening met devicePixelRatio) en zet daarvoor `ctx.setTransform`. Alle tekenfuncties werken in logische pixels.
- Achtermuur y 0..160 (laat de lab-muur met decor van voren zien), vloer `WORLD.FLOOR`, dunne voormuur y 608..640.
- Entiteiten worden getekend met de **voeten/het grondpunt op (x, y)**. De engine sorteert pompoenen, monsters, dieren, obstakels, pickups en speler op y. Formaat ongeveer: speler 56 px hoog, pompoen ~48 px breed, zombie ~60 px hoog, dieren 30–45 px.

## Gedeelde datavormen
```js
profile = {               // persistent (save.js)
  lang: 'nl'|'en', difficulty: 'easy'|'normal'|'hard', musicTrack: 0|1|2,
  musicVolume: 0..1, sfxVolume: 0..1,
  bankCoins: 0, clubTier: 0,            // gekochte knuppel (index in CLUBS)
  ownedPets: [], petLevels: {},         // bijv. ['wolf'], { wolf: 1 }
  level: 1, lastPets: [],               // level waar je verder speelt; laatst gekozen dieren
  hasProgress: false,
}
run = {                   // per level, niet opgeslagen
  level, room /*0..2*/, levelCoins, hearts, clubBoost /*0 of 1*/, pets: [{id, level}],
}
// Effectieve knuppel: tier = min(3, profile.clubTier + run.clubBoost)

player  = { x, y, r, vx, vy, facing:{x,y}, dir:'up'|'down'|'left'|'right', walkPhase, swingT /*-1 of 0..1*/,
            attackCd, invuln, shields }
pumpkin = { id, x, y, r, hp, maxHp, content:'coin'|'monster'|'club', monsterType|null, hitFlash, dead }
monster = { id, type, x, y, r, hp, maxHp, speed, dir, walkPhase, hitFlash,
            state:'rising'|'chase'|'revealed'|'dead', stateT, alpha, touchCd, kx, ky /*knockback*/ }
pet     = { id, level, x, y, dir, walkPhase, action /*0..1 animatie*/, cd, target|null }
pickup  = { kind:'coin'|'club', x, y, value, t, vx, vy, z /*sprong-hoogte*/ }
obstacle= { type, x, y, r }
effect  = { type, x, y, t, dur, data }
```

## Module-API's

### `src/game/input.js` (Engine)
`createInput(canvas) → input` met:
`getMove() → {x, y}` (genormaliseerd, toetsenbord **pijltjes + WASD**, samengevoegd met touch), `consumeAttack() → bool` (spatie/Z/J of touch), `consumePause() → bool` (Esc/P), `setTouchMove(dx, dy)`, `triggerAttack()`, `triggerPause()`.

### `src/game/monsters.js` (Entities)
```js
createMonster(type, x, y, game) → monster   // start in state 'rising'
updateMonster(m, dt, game)                   // AI + beweging + aanraking
```
Skelet en zombie lopen naar de speler toe en botsen met obstakels/muren (`game.resolveCollisions(m)`); zombies schuifelen, skeletten zijn sneller en een beetje schokkerig. De geest zweeft door alles heen, is half doorzichtig (alpha ~0,55) en golft een beetje. Bij `revealed`: stilstaan, alpha 1, na `stateT` terug naar `chase`. Snelheid × `game.diff.monsterSpeed` × eindeloos-factor (`game.speedMul`). Raakt een monster de speler (afstand < r + player.r, touchCd 0) → `game.onMonsterContact(m)` en `touchCd = MONSTER_TOUCH_COOLDOWN`. Werk `dir` en `walkPhase` bij voor animatie.

### `src/game/pets.js` (Entities)
```js
getPetModifiers(pets /*[{id, level}]*/) → { coinBonus, clubBonus, shields, magnetRadius, doubleCoinChance,
                                            catRevealRadius, spikeDamage, hasWolf }   // 0/false als het dier ontbreekt
createPet(id, level, x, y) → pet
updatePet(p, dt, game)
```
Dieren volgen de speler in een losse formatie (niet overlappen). Actief gedrag: wolf (gehuil, zie regels; `game.spawnEffect('howl', …)`, `game.sfx('howl')`, geesten op `revealed` zetten met `stateT = revealTime` en terugduwen), beer (naar doel lopen, `game.damageMonster(m, dmg, 'bear')`, sfx `bearRoar`), vleermuis (`game.damagePumpkin(p, dmg, 'bat')`, sfx `batSquee`). Zet `p.action` (0..1) tijdens een actie voor de animatie. Passieve dieren volgen alleen (en doen soms een idle-animatie).

### `game`-object (Engine levert het, Entities gebruikt het)
```js
game = {
  t, dt, player, pumpkins, monsters, pets, pickups, obstacles, effects, run, profile,
  diff /* DIFFICULTY[profile.difficulty] */, speedMul, mods /* getPetModifiers */,
  damageMonster(m, dmg, source), damagePumpkin(p, dmg, source),
  onMonsterContact(m),          // hurtPlayer + egel-stekels
  hurtPlayer(amount),           // invuln, schildpad-schilden, hartjes, game over
  spawnEffect(type, x, y, data), floatText(text, x, y, color), sfx(name),
  resolveCollisions(entity),    // duwt uit obstakels en houdt binnen de vloer
  nearest(list, x, y, filterFn) → item|null,
}
```

### `src/render/sprites.js` (Art), alle functies tekenen op (x, y) = grondpunt
```js
drawRoom(ctx, room, t)            // room = { theme:0..4, wallDecor:[{type, x}], doorOpen:bool }
                                  // vloer (tegels, 3/4-perspectief), achtermuur met labdecor, zijmuren, voormuur, deur (dicht/open, gloed als open)
drawObstacle(ctx, type, x, y, t)  // 'table'|'cauldron'|'coffin'|'tubes'
drawPlayer(ctx, x, y, { dir, walkPhase, swingT, clubTier, boosted, hurt, t })
drawPumpkin(ctx, x, y, { hpFrac, hitFlash, peek /*null|'coin'|'monster'|'club'*/, t })   // scheuren bij lage hp
drawMonster(ctx, type, x, y, { dir, walkPhase, hitFlash, state, stateT, alpha, t })      // 'rising' = uit de grond klimmen
drawPet(ctx, id, x, y, { dir, walkPhase, action, level, t })
drawPickup(ctx, kind, x, y, { z, t, tier })   // munt (draaiend) of knuppel-item
drawEffect(ctx, effect, t)        // types: 'smash' (pompoenstukjes), 'poof', 'howl' (ringen), 'hit' (sterretje),
                                  // 'bones' (skelet valt uit elkaar), 'coinSparkle', 'shield', 'spikes', 'ghostVanish'
drawShadow(ctx, x, y, w)
renderIcon(kind, id, size) → HTMLCanvasElement   // voor de UI: kind 'pet'|'club'|'coin'|'heart'|'shield'|'monster'
WALL_DECOR_TYPES = ['shelf','window','poster','pipes','clock','skull']   // engine kiest hieruit, x op de muur
```
Stijl: vrolijk-griezelig (niet eng) voor ~12 jaar, dikke contouren, goed leesbaar op een tablet. Het effect van het grondpunt-perspectief moet kloppen (lichte 3/4-hoek, slagschaduwen).

### `src/ui/*` (UI)
- `i18n.js`: `t(key, params)`, `setLang(l)`, `getLang()`, `onLangChange(cb)`. Ontbrekende key → geeft de key terug. Moet in elk geval bevatten: `pet.<id>.name`/`pet.<id>.desc` (voor alle 9 dieren), `club.<id>`, `monster.<type>`, `difficulty.<id>`, `music.0..2`, en deze toasts die de engine gebruikt: `toast.doorOpen`, `toast.ghostImmune`, `toast.clubUp`, `toast.clubMaxCoins`, `toast.shieldBlock`, `toast.roomStart` ({level, room}), `toast.levelStart` ({level}), `toast.newPet` ({name}).
- `save.js`: `defaultProfile()`, `loadProfile() → profile|null`, `saveProfile(profile)`, `resetProgress(profile) → profile` (houdt de instellingen, wist de voortgang).
- `shop.js`: `getShopItems(profile, run) → [{id, kind:'club'|'petUpgrade'|'heart', ref, price, available, owned}]`, `buy(itemId, profile, run) → bool` (wijzigt profile/run, betaalt eerst `run.levelCoins` en daarna `bankCoins`, roept `saveProfile` aan).
- `ui.js`: `createUI({ root, input, audio }) → ui`:
  - `showTitle({ profile, hasSave, onNewGame, onContinue, onSettingsChange })`: titel, Nieuw spel / Verder spelen, instellingen (taal NL/EN, moeilijkheid, muziek 1/2/3 met voorproefje, volumes).
  - `showPetSelect({ profile, preselected, max, level, room, onConfirm(ids) })`
  - `showShop({ profile, run, onClose })`
  - `showLevelComplete({ level, coinsEarned, newPet /*id|null*/, bonusCoins, onNext })`: viert het nieuwe dier groot met `renderIcon('pet', …)`
  - `showGameOver({ level, coinsLost, onRetry, onQuit })`
  - `showVictory({ onContinue, onQuit })`
  - `showPause({ profile, onResume, onQuit, onSettingsChange })`
  - `hideAll()`, `toast(text)`, `updateHUD({ hearts, maxHearts, shields, coins, levelCoins, level, room, roomsPerLevel, clubTier, boosted, pets })`
  - `setTouchControls(visible)`: virtuele joystick links onder (`input.setTouchMove`), slagknop rechts onder (`input.triggerAttack`), automatisch zichtbaar bij touch. De pauzeknop in de HUD (`input.triggerPause`) is altijd zichtbaar.
  - Alle knoppen moeten werken met muis, touch en toetsenbord (Enter/spatie). Grote knoppen, schaalt naar telefoon/tablet.

### `src/audio/audio.js` (Audio)
`export const audio = { unlock(), playMusic(i /*0..2*/), stopMusic(), setMusicVolume(v), setSfxVolume(v), sfx(name) }`. Doet niets en geeft geen fout zolang `unlock()` (bij de eerste gebruikersinteractie) nog niet is aangeroepen. Sfx-namen: `swing, hitPumpkin, smashPumpkin, coin, clubUp, hitMonster, monsterDie, skeletonBreak, zombieGroan, ghostWail, ghostImmune, howl, hurt, shieldBlock, gameOver, roomClear, levelComplete, newPet, buy, click, doorOpen, bearRoar, batSquee, rise`. Onbekende naam → stil negeren.

## v2-wijzigingen (feedback na de eerste speelronde)
Alle nieuwe getallen staan in `src/config.js` (`SPAWNER`, `UPGRADES`, `playerStats()`, `CLUBS[4]` diamant, `MAX_BOOST_TIER`, `LEVELS.pumpkins`).
1. **Hoek-glitch:** loop je in de linker- of rechterbovenhoek van de kamer, dan word je naar het midden verplaatst. Dat moet weg.
2. **Ongeveer 2x zoveel pompoenen**, die sneller groeien per level (`LEVELS.pumpkins`: level 1 10/12/14, level 5 18/20/22, max 30). De plaatsing moet bereikbaar blijven.
3. **Spawner:** elke 5–10 s (`SPAWNER.interval[difficulty]`) verschijnt er een monster: 55% zombie / 30% skelet / 15% geest. In level 1 zonder geesten (65/35). Het verschijnt op een willekeurige vloerplek op ≥ `minDistFromPlayer` van de speler, niet in een obstakel of pompoen, met de bestaande 'rising'-animatie. Maximaal `maxAlive(level)` gespawnde monsters tegelijk. Krijgt `m.spawned = true` en blokkeert de deur **niet** (alleen monsters uit pompoenen blokkeren de deur, zoals in v1). Het spawnen gaat door tot je de kamer verlaat; de eerste spawn komt na `firstDelay` s.
4. **Winkel-upgrades** (permanent, `profile.upgrades`): 4e/5e dierplek (vanaf level 7/12), extra max hartje (6/7), snelle schoenen, snelle zwaai, lange arm (bereik), geluksklaver (+1 munt per munt-pompoen). Plus een **diamanten knuppel** (1 klap, vanaf level 8). Een item dat nog op slot zit, staat zichtbaar in de winkel met een slotje en de tekst "vanaf level X". Engine en UI gebruiken `playerStats(profile)` voor maxHearts, snelheid, slagpauze, bereik, opraapafstand, muntbonus en het aantal dierplekken.
5. **Geluid aan/uit:** in Instellingen (titelscherm en pauzemenu) twee schakelaars: "Muziek aan/uit" en "Geluidseffecten aan/uit". Opgeslagen als `profile.musicOn` / `profile.sfxOn` (default true). Het effectieve volume = aan ? volume : 0, toegepast bij het opstarten, bij elke instellingswijziging en bij de sliders.
