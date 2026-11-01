// Vertalingen NL/EN. t(key, params) met {param}-interpolatie; ontbrekende key → de key zelf.

const STRINGS = {
  nl: {
    'game.title': 'Pompoenlab',
    'game.subtitle': 'Sla pompoenen, vang muntjes, verzamel dieren!',

    // Titelscherm
    'title.newGame': 'Nieuw spel',
    'title.continue': 'Verder spelen',
    'title.continueLevel': 'Level {level}',
    'title.settings': 'Instellingen',
    'title.howTo': 'Hoe speel je?',
    'title.confirmNew': 'Nieuw spel beginnen?',
    'title.confirmNewText': 'Je voortgang wordt gewist: je muntjes, knuppels en dieren ben je dan kwijt.',
    'title.confirmYes': 'Ja, opnieuw',
    'title.confirmNo': 'Nee, terug',

    // Instellingen
    'settings.title': 'Instellingen',
    'settings.language': 'Taal',
    'settings.difficulty': 'Moeilijkheid',
    'settings.music': 'Liedje',
    'settings.musicOn': 'Muziek',
    'settings.sfxOn': 'Geluidseffecten',
    'settings.on': 'aan',
    'settings.off': 'uit',
    'settings.switchAria': '{name}: {state}',
    'settings.musicVolume': 'Muziekvolume',
    'settings.sfxVolume': 'Volume geluidseffecten',
    'settings.close': 'Klaar',

    'difficulty.easy': 'Makkelijk',
    'difficulty.normal': 'Normaal',
    'difficulty.hard': 'Moeilijk',

    'music.0': 'Spookswing',
    'music.1': 'Labbeats',
    'music.2': 'Griezelwals',

    // Hoe speel je
    'howto.title': 'Hoe speel je?',
    'howto.move': 'Lopen: pijltjestoetsen of WASD. Op een tablet: de joystick links onder.',
    'howto.hit': 'Slaan: spatie. Op een tablet: de grote knop rechts onder.',
    'howto.pumpkins': 'Sla de pompoenen kapot! Er zit een muntje, een betere knuppel of een monster in.',
    'howto.door': 'Zijn alle pompoenen kapot en alle skeletten en zombies verslagen? Dan gaat de deur open.',
    'howto.ghosts': 'Geesten kun je alleen raken als de wolf ze met zijn gehuil heeft onthuld.',
    'howto.pets': 'Na elk level krijg je een nieuw dier. Neem er 3 mee per kamer (met upgrades zelfs 5).',
    'howto.shop': 'Koop in de winkel betere knuppels, upgrades voor jezelf en je dieren, en extra hartjes.',
    'howto.hearts': 'Pas op voor monsters: zonder hartjes moet je het level opnieuw doen.',
    'howto.close': 'Snap ik!',

    // Dieren kiezen
    'pets.title': 'Kies je dieren',
    'pets.subtitle': 'Level {level} – Kamer {room}: neem er maximaal {max} mee',
    'pets.count': '{n}/{max}',
    'pets.start': 'Start!',
    'pets.none': 'Zonder dieren',
    'pets.level': 'Niveau {level}',
    'pets.wolfHint': 'Let op: zonder de wolf kun je geesten niet raken!',

    // Winkel
    'shop.title': 'Winkel',
    'shop.coins': 'Je muntjes',
    'shop.levelNote': '{n} daarvan verdiende je in dit level. Die ben je kwijt bij game over.',
    'shop.buy': 'Koop',
    'shop.owned': 'Heb je al',
    'shop.maxed': 'Maximaal',
    'shop.tooExpensive': 'Te duur',
    'shop.full': 'Vol',
    'shop.continue': 'Verder',
    'shop.club': 'Knuppel: {name}',
    'shop.clubDesc': 'Voor altijd! Pompoen kapot in {hits} klappen.',
    'shop.petUpgrade': '{name} → niveau {level}',
    'shop.petUpgradeDesc': 'Maakt de kracht van je dier sterker.',
    'shop.heart': '+1 hartje',
    'shop.heartDesc': 'Een extra hartje voor dit level.',
    'shop.empty': 'Alles is uitverkocht!',
    'shop.bought': 'Gekocht!',
    'shop.clubDescOne': 'Voor altijd! Pompoen in 1 klap!',
    'shop.locked': 'Vanaf level {level}',
    'shop.lockedAria': '{name} zit op slot tot level {level}',
    'shop.upgradeStep': 'Stap {n} van {max}',
    'shop.section.clubs': 'Knuppels',
    'shop.section.upgrades': 'Upgrades',
    'shop.section.pets': 'Dieren',
    'shop.section.hearts': 'Hartjes',

    // Upgrades (permanent)
    'upgrade.petSlot.name': 'Extra dierplek',
    'upgrade.petSlot.desc': 'Neem een dier extra mee de kamer in.',
    'upgrade.maxHeart.name': 'Extra hartje',
    'upgrade.maxHeart.desc': 'Voor altijd een hartje meer!',
    'upgrade.shoes.name': 'Snelle schoenen',
    'upgrade.shoes.desc': 'Ren sneller door het lab.',
    'upgrade.swing.name': 'Snelle zwaai',
    'upgrade.swing.desc': 'Sla sneller achter elkaar.',
    'upgrade.reach.name': 'Lange arm',
    'upgrade.reach.desc': 'Raak pompoenen van verder weg.',
    'upgrade.magnet.name': 'Muntmagneet',
    'upgrade.magnet.desc': 'Raap muntjes van verder weg op.',
    'upgrade.luck.name': 'Geluksklaver',
    'upgrade.luck.desc': 'Elke muntpompoen geeft een muntje extra.',

    // Level klaar
    'level.complete': 'Level {level} klaar!',
    'level.coinsEarned': '+{n} muntjes verdiend',
    'level.newPet': 'Nieuw dier: {name}!',
    'level.allPets': 'Je hebt alle dieren al! Bonus:',
    'level.bonusCoins': '+{n} bonusmuntjes',
    'level.next': 'Verder',

    // Game over
    'gameover.title': 'Oei, game over!',
    'gameover.text': 'De monsters waren te sterk. Probeer level {level} nog een keer!',
    'gameover.lost': 'Je bent {n} muntjes van dit level kwijt.',
    'gameover.kept': 'Je aankopen en dieren houd je.',
    'gameover.retry': 'Opnieuw proberen',
    'gameover.quit': 'Naar menu',

    // Overwinning
    'victory.title': 'Je hebt gewonnen!',
    'victory.text': 'Het Pompoenlab is gered! Speel door om alle dieren te verzamelen.',
    'victory.continue': 'Doorspelen (eindeloos)',
    'victory.quit': 'Naar menu',

    // Pauze
    'pause.title': 'Pauze',
    'pause.resume': 'Verder spelen',
    'pause.settings': 'Instellingen',
    'pause.quit': 'Naar menu',
    'pause.confirmQuit': 'Naar het menu? Je begint dit level dan straks opnieuw.',
    'pause.confirmYes': 'Ja, naar menu',
    'pause.confirmNo': 'Nee, verder',

    // HUD
    'hud.level': 'Level {level} – Kamer {room}/{rooms}',
    'hud.levelCoins': '+{n} dit level',
    'hud.pause': 'Pauze',
    'hud.attack': 'Slaan',

    // Dieren
    'pet.wolf.name': 'Wolf',
    'pet.wolf.desc': 'Huilt als er een geest in de buurt is. Dan kun je de geest raken!',
    'pet.dog.name': 'Hond',
    'pet.dog.desc': 'Snuffelt muntjes op: meer pompoenen met geld.',
    'pet.bear.name': 'Beer',
    'pet.bear.desc': 'Stoere vechter: meppen tegen skeletten en zombies.',
    'pet.cat.name': 'Kat',
    'pet.cat.desc': 'Ziet wat er in pompoenen zit: muntje, monster of knuppel.',
    'pet.owl.name': 'Uil',
    'pet.owl.desc': 'Slimme uil: vaker een betere knuppel in een pompoen.',
    'pet.bat.name': 'Vleermuis',
    'pet.bat.desc': 'Fladdert naar pompoenen en hakt ze mee kapot.',
    'pet.turtle.name': 'Schildpad',
    'pet.turtle.desc': 'Geeft je schildjes die een klap opvangen.',
    'pet.hedgehog.name': 'Egel',
    'pet.hedgehog.desc': 'Au! Monsters die jou raken prikken zich. Skeletten breken meteen.',
    'pet.raven.name': 'Raaf',
    'pet.raven.desc': 'Trekt muntjes naar je toe, soms zelfs dubbel!',

    // Knuppels
    'club.wood': 'Houten knuppel',
    'club.stone': 'Stenen knuppel',
    'club.iron': 'IJzeren knuppel',
    'club.gold': 'Gouden knuppel',
    'club.diamond': 'Diamanten knuppel',

    // Monsters
    'monster.skeleton': 'Skelet',
    'monster.zombie': 'Zombie',
    'monster.ghost': 'Geest',

    // Toasts
    'toast.doorOpen': 'De deur is open!',
    'toast.ghostImmune': 'Geesten kun je alleen raken als de wolf huilt!',
    'toast.clubUp': 'Betere knuppel voor dit level!',
    'toast.clubMaxCoins': 'Al een gouden knuppel: muntjes!',
    'toast.shieldBlock': 'Schild ving de klap op!',
    'toast.roomStart': 'Level {level} – Kamer {room}',
    'toast.levelStart': 'Level {level}!',
    'toast.newPet': 'Nieuw dier: {name}!',
  },

  en: {
    'game.title': 'Pompoenlab',
    'game.subtitle': 'Smash pumpkins, grab coins, collect pets!',

    'title.newGame': 'New game',
    'title.continue': 'Continue',
    'title.continueLevel': 'Level {level}',
    'title.settings': 'Settings',
    'title.howTo': 'How to play',
    'title.confirmNew': 'Start a new game?',
    'title.confirmNewText': 'Your progress will be erased: your coins, clubs and pets will be gone.',
    'title.confirmYes': 'Yes, start over',
    'title.confirmNo': 'No, go back',

    'settings.title': 'Settings',
    'settings.language': 'Language',
    'settings.difficulty': 'Difficulty',
    'settings.music': 'Song',
    'settings.musicOn': 'Music',
    'settings.sfxOn': 'Sound effects',
    'settings.on': 'on',
    'settings.off': 'off',
    'settings.switchAria': '{name}: {state}',
    'settings.musicVolume': 'Music volume',
    'settings.sfxVolume': 'Sound effects volume',
    'settings.close': 'Done',

    'difficulty.easy': 'Easy',
    'difficulty.normal': 'Normal',
    'difficulty.hard': 'Hard',

    'music.0': 'Spooky Swing',
    'music.1': 'Lab Beats',
    'music.2': 'Creepy Waltz',

    'howto.title': 'How to play',
    'howto.move': 'Walk: arrow keys or WASD. On a tablet: the joystick at the bottom left.',
    'howto.hit': 'Hit: space bar. On a tablet: the big button at the bottom right.',
    'howto.pumpkins': 'Smash the pumpkins! Inside is a coin, a better club or a monster.',
    'howto.door': 'All pumpkins smashed and all skeletons and zombies beaten? Then the door opens.',
    'howto.ghosts': 'You can only hit ghosts after the wolf has revealed them with its howl.',
    'howto.pets': 'You get a new pet after every level. Take 3 pets into each room (up to 5 with upgrades).',
    'howto.shop': 'Buy better clubs, upgrades for you and your pets, and extra hearts in the shop.',
    'howto.hearts': 'Watch out for monsters: run out of hearts and you have to redo the level.',
    'howto.close': 'Got it!',

    'pets.title': 'Pick your pets',
    'pets.subtitle': 'Level {level} – Room {room}: take up to {max}',
    'pets.count': '{n}/{max}',
    'pets.start': 'Start!',
    'pets.none': 'No pets',
    'pets.level': 'Level {level}',
    'pets.wolfHint': 'Careful: without the wolf you can\'t hit ghosts!',

    'shop.title': 'Shop',
    'shop.coins': 'Your coins',
    'shop.levelNote': '{n} of those were earned this level. You lose them on game over.',
    'shop.buy': 'Buy',
    'shop.owned': 'Owned',
    'shop.maxed': 'Maxed',
    'shop.tooExpensive': 'Too pricey',
    'shop.full': 'Full',
    'shop.continue': 'Continue',
    'shop.club': 'Club: {name}',
    'shop.clubDesc': 'Forever! Smashes a pumpkin in {hits} hits.',
    'shop.petUpgrade': '{name} → level {level}',
    'shop.petUpgradeDesc': 'Makes your pet\'s power stronger.',
    'shop.heart': '+1 heart',
    'shop.heartDesc': 'An extra heart for this level.',
    'shop.empty': 'Everything is sold out!',
    'shop.bought': 'Bought!',
    'shop.clubDescOne': 'Forever! Pumpkin in 1 hit!',
    'shop.locked': 'From level {level}',
    'shop.lockedAria': '{name} is locked until level {level}',
    'shop.upgradeStep': 'Step {n} of {max}',
    'shop.section.clubs': 'Clubs',
    'shop.section.upgrades': 'Upgrades',
    'shop.section.pets': 'Pets',
    'shop.section.hearts': 'Hearts',

    'upgrade.petSlot.name': 'Extra pet spot',
    'upgrade.petSlot.desc': 'Take one more pet into the room.',
    'upgrade.maxHeart.name': 'Extra heart',
    'upgrade.maxHeart.desc': 'One more heart, forever!',
    'upgrade.shoes.name': 'Speedy shoes',
    'upgrade.shoes.desc': 'Run faster through the lab.',
    'upgrade.swing.name': 'Quick swing',
    'upgrade.swing.desc': 'Hit faster, again and again.',
    'upgrade.reach.name': 'Long arm',
    'upgrade.reach.desc': 'Hit pumpkins from further away.',
    'upgrade.magnet.name': 'Coin magnet',
    'upgrade.magnet.desc': 'Grab coins from further away.',
    'upgrade.luck.name': 'Lucky clover',
    'upgrade.luck.desc': 'Every coin pumpkin gives one extra coin.',

    'level.complete': 'Level {level} complete!',
    'level.coinsEarned': '+{n} coins earned',
    'level.newPet': 'New pet: {name}!',
    'level.allPets': 'You already have every pet! Bonus:',
    'level.bonusCoins': '+{n} bonus coins',
    'level.next': 'Continue',

    'gameover.title': 'Oops, game over!',
    'gameover.text': 'The monsters were too strong. Give level {level} another try!',
    'gameover.lost': 'You lost the {n} coins from this level.',
    'gameover.kept': 'You keep your purchases and pets.',
    'gameover.retry': 'Try again',
    'gameover.quit': 'To menu',

    'victory.title': 'You won!',
    'victory.text': 'Pompoenlab is saved! Keep playing to collect every pet.',
    'victory.continue': 'Keep playing (endless)',
    'victory.quit': 'To menu',

    'pause.title': 'Paused',
    'pause.resume': 'Resume',
    'pause.settings': 'Settings',
    'pause.quit': 'To menu',
    'pause.confirmQuit': 'Back to the menu? You will restart this level later.',
    'pause.confirmYes': 'Yes, to menu',
    'pause.confirmNo': 'No, keep playing',

    'hud.level': 'Level {level} – Room {room}/{rooms}',
    'hud.levelCoins': '+{n} this level',
    'hud.pause': 'Pause',
    'hud.attack': 'Hit',

    'pet.wolf.name': 'Wolf',
    'pet.wolf.desc': 'Howls when a ghost is near. Then you can hit the ghost!',
    'pet.dog.name': 'Dog',
    'pet.dog.desc': 'Sniffs out money: more pumpkins with coins.',
    'pet.bear.name': 'Bear',
    'pet.bear.desc': 'Tough fighter: bonks skeletons and zombies.',
    'pet.cat.name': 'Cat',
    'pet.cat.desc': 'Sees what is inside pumpkins: coin, monster or club.',
    'pet.owl.name': 'Owl',
    'pet.owl.desc': 'Wise owl: better clubs show up in pumpkins more often.',
    'pet.bat.name': 'Bat',
    'pet.bat.desc': 'Flutters to pumpkins and helps smash them.',
    'pet.turtle.name': 'Turtle',
    'pet.turtle.desc': 'Gives you shields that block a hit.',
    'pet.hedgehog.name': 'Hedgehog',
    'pet.hedgehog.desc': 'Ouch! Monsters that touch you get spiked. Skeletons break at once.',
    'pet.raven.name': 'Raven',
    'pet.raven.desc': 'Pulls coins towards you, sometimes worth double!',

    'club.wood': 'Wooden club',
    'club.stone': 'Stone club',
    'club.iron': 'Iron club',
    'club.gold': 'Golden club',
    'club.diamond': 'Diamond club',

    'monster.skeleton': 'Skeleton',
    'monster.zombie': 'Zombie',
    'monster.ghost': 'Ghost',

    'toast.doorOpen': 'The door is open!',
    'toast.ghostImmune': 'You can only hit ghosts when the wolf howls!',
    'toast.clubUp': 'Better club for this level!',
    'toast.clubMaxCoins': 'Already golden: coins instead!',
    'toast.shieldBlock': 'Your shield blocked the hit!',
    'toast.roomStart': 'Level {level} – Room {room}',
    'toast.levelStart': 'Level {level}!',
    'toast.newPet': 'New pet: {name}!',
  },
};

let lang = 'nl';
const listeners = new Set();

export function t(key, params) {
  let s = STRINGS[lang]?.[key];
  if (s == null) s = STRINGS.nl[key];
  if (s == null) return key;
  if (params) {
    s = s.replace(/\{(\w+)\}/g, (m, p) => (params[p] != null ? String(params[p]) : m));
  }
  return s;
}

export function setLang(l) {
  const next = STRINGS[l] ? l : 'nl';
  if (next === lang) return;
  lang = next;
  try { document.documentElement.lang = lang; } catch (e) { /* geen DOM */ }
  for (const cb of [...listeners]) {
    try { cb(lang); } catch (e) { console.error(e); }
  }
}

export function getLang() { return lang; }

// Geeft een afmeldfunctie terug.
export function onLangChange(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
