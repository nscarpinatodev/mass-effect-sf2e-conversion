"""Build an NPC statblock from a short spec, with every number taken from the GM Core creature-building tables.

A spec names the level and, for each statistic, a band ("extreme", "high", "moderate", "low", "terrible").
The builder fills in the numbers for that level, copies the module's own gear from the compendiums (weapons,
armor, Kinetic Shield and Shield HP/Regen mods), builds a linked Strike for every weapon, copies NPC Biotics /
NPC Tech powers, and writes the actor JSON into src/packs/me-npcs/<folder>/<slug>.json.

Ability text in a spec can use {dc}, {dc_mod} (extreme/high/moderate DCs come from DC[level]) and helpers such as
dmg(level, 'high', 6) for a damage formula of the right average.

Used by the stage scripts that add the named characters; see rescale-npc.py for the tables.
"""
import copy
import glob
import importlib.util
import json
import math
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_spec = importlib.util.spec_from_file_location('rescale', os.path.join(ROOT, 'scripts', 'rescale-npc.py'))
R = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(R)

MOD = 'mass-effect-sf2e-conversion'
ART = f'modules/{MOD}/assets/img'
PUB = {'title': 'Mass Effect Compendium', 'authors': 'nscarpinatodev', 'license': 'ORC', 'remaster': True}
GLYPH = {1: ('OneAction', '1'), 2: ('TwoActions', '2'), 3: ('ThreeActions', '3'), 'reaction': ('Reaction', 'R'),
         'free': ('FreeAction', 'F')}
BANDS4 = {'extreme': 0, 'high': 1, 'moderate': 2, 'low': 3}
BANDS5 = {'extreme': 0, 'high': 1, 'moderate': 2, 'low': 3, 'terrible': 4}
HP_BANDS = {'high': 0, 'moderate': 1, 'low': 2}
DC_BANDS = {'extreme': 0, 'high': 1, 'moderate': 2}
SHIELD_HP = {30: None, 40: 'meShieldHpMod001', 50: 'meShieldHpMod002', 70: 'meShieldHpMod003', 100: 'meShieldHpMod004'}
SHIELD_REGEN = {10: None, 15: 'meShieldRegen001', 20: 'meShieldRegen002', 25: 'meShieldRegen003', 30: 'meShieldRegen004'}


def _load_pack(pack):
    out = {}
    for f in glob.glob(os.path.join(ROOT, 'src', 'packs', pack, '**', '*.json'), recursive=True):
        d = json.load(open(f, encoding='utf-8'))
        if 'system' in d:
            out[d['name']] = d
    return out


WEAPONS, ARMORS, SHIELDS = _load_pack('me-weapons'), _load_pack('me-armors'), _load_pack('me-shields')
POWERS = {}            # name -> (pack, document)
for _pack in ('me-biotic-powers', 'me-tech-powers'):
    POWERS.update({name: (_pack, doc) for name, doc in _load_pack(_pack).items()})
SHIELD_BY_ID = {d['_id']: d for d in SHIELDS.values()}


def dc(level, band='high'):
    return R.DC[R.clamp(level)][DC_BANDS[band]]


def dmg(level, band='moderate', die=6, kind=None):
    """A damage formula whose average matches the band at this level, using the given die size."""
    target = R.DMG[R.clamp(level)][BANDS4[band]]
    per_die = (die + 1) / 2
    n = max(1, round(target * 0.6 / per_die))
    flat = round(target - n * per_die)
    f = f'{n}d{die}' + (f'+{flat}' if flat > 0 else f'{flat}' if flat < 0 else '')
    return f'{f}[{kind}]' if kind else f


class Npc:
    def __init__(self, spec):
        self.spec = spec
        self.id = spec['id']
        assert len(self.id) == 16, self.id
        self.level = spec['level']
        self.items = []
        self.n = 0

    def _id(self):
        self.n += 1
        return (self.id[:12] + f'{self.n:04d}')[:16]

    def _add(self, item, source=None):
        item = copy.deepcopy(item)
        for k in ('_key', 'folder'):
            item.pop(k, None)
        item['_id'] = self._id()
        item['_key'] = f'!actors.items!{self.id}.{item["_id"]}'
        item['sort'] = self.n * 100000
        item.setdefault('effects', [])
        item.setdefault('flags', {})
        item.setdefault('ownership', {'default': 0})
        item['folder'] = None
        if source:
            item['_stats'] = {'compendiumSource': source}
        self.items.append(item)
        return item

    def weapon(self, name):
        w = WEAPONS[name]
        inv = self._add(w, f'Compendium.{MOD}.me-weapons.Item.{w["_id"]}')
        strike = {'name': name, 'type': 'melee', 'img': w['img'],
                  'flags': {'pf2e': {'linkedWeapon': inv['_id']}},
                  'system': {'slug': None, 'bonus': {'value': 0}, 'damageRolls': {}, 'rules': [],
                             'traits': {'value': [], 'otherTags': [], 'config': {}},
                             'description': {'value': '', 'gm': ''}, 'attackEffects': {'value': []},
                             'publication': PUB, '_migration': {'version': None, 'previous': None},
                             'action': 'strike', 'area': None, 'range': None, 'subjectToMAP': True,
                             'weaponType': {'value': 'ranged'}}}
        R.weapon_strike(strike, w, self.level)
        traits = list(w['system']['traits']['value'])
        if w['system'].get('range'):
            traits.append(f'range-increment-{w["system"]["range"]}')
        strike['system']['traits']['value'] = traits
        # strikes go first on the sheet
        s = self._add(strike)
        self.items.remove(s)
        self.items.insert(sum(1 for i in self.items if i['type'] == 'melee'), s)

    def melee(self, name, band, die, kind, traits):
        attack = R.ATTACK[R.clamp(self.level)][BANDS4[band]]
        self._add({'name': name, 'type': 'melee', 'img': 'systems/pf2e/icons/default-icons/melee.svg',
                   'system': {'slug': None, 'bonus': {'value': attack},
                              'damageRolls': {'0': {'damage': dmg(self.level, band, die), 'damageType': kind, 'category': None}},
                              'traits': {'value': traits, 'otherTags': [], 'config': {}}, 'rules': [],
                              'description': {'value': '', 'gm': ''}, 'attackEffects': {'value': []},
                              'publication': PUB, '_migration': {'version': None, 'previous': None},
                              'action': 'strike', 'area': None, 'range': None, 'subjectToMAP': True}})

    def armor(self, name):
        a = ARMORS[name]
        self._add(a, f'Compendium.{MOD}.me-armors.Item.{a["_id"]}')

    def shield(self, total=30, regen=10):
        kin = SHIELD_BY_ID['meKineticShield0']
        self._add(kin, f'Compendium.{MOD}.me-shields.Item.meKineticShield0')
        for table, value in ((SHIELD_HP, total), (SHIELD_REGEN, regen)):
            mid = table[value]
            if mid:
                self._add(SHIELD_BY_ID[mid], f'Compendium.{MOD}.me-shields.Item.{mid}')
        self.shield_total = total

    def power(self, name):
        pack, p = POWERS[name]
        self._add(p, f'Compendium.{MOD}.{pack}.Item.{p["_id"]}')

    def barrier(self):
        b = SHIELDS['Activate Biotic Barrier (NPC)']
        self._add(b, f'Compendium.{MOD}.me-shields.Item.{b["_id"]}')

    def action(self, name, cost, traits, text, rules=()):
        kind = cost if cost in ('reaction', 'free') else ('passive' if cost is None else 'action')
        icon, mark = GLYPH.get(cost, ('Passive', ''))
        glyph = f' <span class="action-glyph">{mark}</span>' if mark else ''
        self._add({'name': name, 'type': 'action', 'img': f'systems/pf2e/icons/actions/{icon}.webp',
                   'system': {'slug': None, 'description': {'value': f'<p><strong>{name}</strong>{glyph}</p><hr /><p>{text}</p>', 'gm': ''},
                              'rules': list(rules), 'traits': {'otherTags': [], 'value': traits},
                              'actionType': {'value': kind}, 'actions': {'value': cost if isinstance(cost, int) else None},
                              'category': 'offensive' if kind != 'passive' else 'interaction',
                              'publication': PUB, '_migration': {'version': None, 'previous': None}}})

    def build(self):
        sp = self.spec
        lvl = R.clamp(self.level)
        d = copy.deepcopy(json.load(open(os.path.join(ROOT, 'src', 'packs', 'me-npcs', 'generic-species', 'human-soldier.json'), encoding='utf-8')))
        folder = json.load(open(os.path.join(ROOT, 'src', 'packs', 'me-npcs', sp['folder'], '_folder.json'), encoding='utf-8'))['_id']
        img = f'{ART}/npcs/{sp["art"]}'
        d.update({'_id': self.id, '_key': f'!actors!{self.id}', 'name': sp['name'], 'img': img, 'folder': folder, 'items': self.items})
        pt = d['prototypeToken']
        pt['name'] = sp['name']
        pt['texture']['src'] = img                       # the token baker turns this into a ring token
        pt['ring'] = {**pt.get('ring', {}), 'enabled': False, 'subject': {'scale': 1, 'texture': None}}
        s = d['system']
        hp = round(R.HP[lvl][HP_BANDS[sp['hp']]])
        temp = getattr(self, 'shield_total', 0)
        s['attributes'].update({'hp': {'value': hp, 'temp': temp, 'max': hp, 'details': ''},
                                'ac': {'value': R.AC[lvl][BANDS4[sp['ac']]], 'details': ''},
                                'speed': {'value': sp.get('speed', 25), 'otherSpeeds': [], 'details': ''}})
        s['attributes']['immunities'] = [{'type': t} for t in sp.get('immunities', [])]
        s['attributes']['resistances'] = sp.get('resistances', [])
        s['details'].update({'level': {'value': self.level}, 'blurb': sp['blurb'], 'publication': PUB,
                             'languages': {'value': [], 'details': sp.get('languages', 'Galactic Common (translator)')},
                             'publicNotes': sp['notes'] + (f'<p><strong>Kinetic Barrier:</strong> {temp} Shield HP.</p>' if temp else '')})
        s['abilities'] = {k: {'mod': R.ATTR[lvl][BANDS4[b]] if isinstance(b, str) else b} for k, b in sp['abilities'].items()}
        s['perception'] = {'details': '', 'mod': R.SAVE[lvl][BANDS5[sp['perception']]], 'senses': [], 'vision': True}
        s['saves'] = {k: {'value': R.SAVE[lvl][BANDS5[b]], 'saveDetail': ''} for k, b in sp['saves'].items()}
        s['skills'] = {k: {'base': R.SKILL[lvl][BANDS4[b]]} for k, b in sp['skills'].items()}
        s['traits'] = {'value': sp['traits'], 'rarity': sp.get('rarity', 'unique'), 'size': {'value': sp.get('size', 'med')}}
        return d


def write(d, folder):
    slug = d['name'].lower().replace("'", '').replace(' ', '-')
    path = os.path.join(ROOT, 'src', 'packs', 'me-npcs', folder, f'{slug}.json')
    with open(path, 'w', encoding='utf-8', newline='') as fh:
        fh.write(json.dumps(d, indent=2, ensure_ascii=False).replace('\n', '\r\n'))
    return path
