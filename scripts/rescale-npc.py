"""Rebuild an NPC statblock at a new level, keeping each statistic in the band it was designed for.

For every number the PF2e GM Core creature-building tables cover (AC, HP, Perception, saves, skills, attribute
modifiers, Strike attack, Strike damage, ability DCs and damage), the tool finds which band the current value is
closest to at the old level (extreme, high, moderate, low...) and how far off it sits, then writes that band's
value at the new level with the same offset. A high-AC brute stays high-AC; a fragile caster stays fragile.

- Strikes linked to an inventory weapon (flags.pf2e.linkedWeapon) are rebuilt from the weapon, using the same
  rules as the NPC weapon pass: high attack, the weapon's dice plus level striking, half moderate damage (capped
  at extreme).
- Other Strikes (claws, batons, biotic lashes) keep their dice size; attack and damage move by band.
- Ability text: "DC NN", @Check[...|dc:NN], @Damage[...] and [[/r ...]] rolls move by band. The self-scaling
  NPC Biotics (resolve(...) formulas) are left alone, because they already follow the actor's level.

Usage:
  python scripts/rescale-npc.py <actor.json> <new level> [--dry-run]
"""
import json
import math
import re
import sys

# GM Core creature-building tables, levels -1..20
AC = {-1: (18, 15, 14, 12), 0: (19, 16, 15, 13), 1: (19, 16, 15, 13), 2: (21, 18, 17, 15), 3: (22, 19, 18, 16),
      4: (24, 21, 20, 18), 5: (25, 22, 21, 19), 6: (27, 24, 23, 21), 7: (28, 25, 24, 22), 8: (30, 27, 26, 24),
      9: (31, 28, 27, 25), 10: (33, 30, 29, 27), 11: (34, 31, 30, 28), 12: (36, 33, 32, 30), 13: (37, 34, 33, 31),
      14: (39, 36, 35, 33), 15: (40, 37, 36, 34), 16: (42, 39, 38, 36), 17: (43, 40, 39, 37), 18: (45, 42, 41, 39),
      19: (46, 43, 42, 40), 20: (48, 45, 44, 42)}
SAVE = {-1: (9, 8, 5, 2, 0), 0: (10, 9, 6, 3, 1), 1: (11, 10, 7, 4, 2), 2: (12, 11, 8, 5, 3), 3: (14, 12, 9, 6, 4),
        4: (15, 14, 11, 8, 6), 5: (17, 15, 12, 9, 7), 6: (18, 17, 14, 11, 8), 7: (20, 18, 15, 12, 10),
        8: (21, 19, 16, 13, 11), 9: (23, 21, 18, 15, 12), 10: (24, 22, 19, 16, 14), 11: (26, 24, 21, 18, 15),
        12: (27, 25, 22, 19, 16), 13: (29, 26, 23, 20, 18), 14: (30, 28, 25, 22, 19), 15: (32, 29, 26, 23, 20),
        16: (33, 30, 28, 25, 22), 17: (35, 32, 29, 26, 23), 18: (36, 33, 30, 27, 24), 19: (38, 35, 32, 28, 26),
        20: (39, 36, 33, 29, 27)}
HP = {-1: (9, 7.5, 5.5), 0: (18.5, 15, 12), 1: (25, 20, 15), 2: (38, 30, 23), 3: (56, 45, 34), 4: (75, 60, 45),
      5: (94, 75, 56), 6: (119, 95, 71), 7: (144, 115, 86), 8: (169, 135, 101), 9: (194, 155, 116),
      10: (219, 175, 131), 11: (244, 195, 146), 12: (269, 215, 161), 13: (294, 235, 176), 14: (319, 255, 191),
      15: (344, 275, 206), 16: (369, 295, 221), 17: (394, 315, 236), 18: (419, 335, 251), 19: (444, 355, 266),
      20: (469, 375, 281)}
SKILL = {-1: (8, 5, 4, 2), 0: (9, 6, 5, 3), 1: (10, 7, 6, 4), 2: (11, 8, 7, 5), 3: (13, 10, 9, 7), 4: (15, 12, 10, 8),
         5: (16, 13, 12, 9), 6: (18, 15, 13, 10), 7: (20, 17, 15, 12), 8: (21, 18, 16, 13), 9: (23, 20, 18, 15),
         10: (25, 22, 19, 16), 11: (26, 23, 21, 17), 12: (28, 25, 22, 19), 13: (30, 27, 24, 20), 14: (31, 28, 25, 22),
         15: (33, 30, 27, 23), 16: (35, 32, 28, 25), 17: (36, 33, 30, 26), 18: (38, 35, 31, 27), 19: (40, 37, 33, 29),
         20: (41, 38, 34, 30)}
ATTR = {-1: (4, 3, 2, 0), 0: (4, 3, 2, 0), 1: (5, 4, 3, 1), 2: (5, 4, 3, 1), 3: (5, 4, 3, 1), 4: (6, 5, 3, 2),
        5: (6, 5, 4, 2), 6: (7, 5, 4, 2), 7: (7, 6, 4, 2), 8: (7, 6, 4, 3), 9: (7, 6, 4, 3), 10: (8, 7, 5, 3),
        11: (8, 7, 5, 3), 12: (8, 7, 5, 4), 13: (9, 8, 5, 4), 14: (9, 8, 5, 4), 15: (9, 8, 6, 4), 16: (10, 9, 6, 5),
        17: (10, 9, 6, 5), 18: (10, 9, 6, 5), 19: (11, 10, 6, 5), 20: (11, 10, 7, 6)}
ATTACK = {-1: (10, 8, 6, 4), 0: (10, 8, 6, 4), 1: (11, 9, 7, 5), 2: (13, 11, 9, 7), 3: (14, 12, 10, 8),
          4: (16, 14, 12, 10), 5: (17, 15, 13, 11), 6: (19, 17, 15, 13), 7: (20, 18, 16, 14), 8: (22, 20, 18, 16),
          9: (23, 21, 19, 17), 10: (25, 23, 21, 19), 11: (27, 24, 22, 20), 12: (28, 26, 24, 22), 13: (29, 27, 25, 23),
          14: (31, 29, 27, 25), 15: (32, 30, 28, 26), 16: (34, 32, 30, 28), 17: (35, 33, 31, 29), 18: (37, 35, 33, 31),
          19: (38, 36, 34, 32), 20: (40, 38, 36, 34)}
DC = {-1: (19, 16, 13), 0: (19, 16, 13), 1: (20, 17, 14), 2: (22, 18, 15), 3: (23, 20, 17), 4: (25, 21, 18),
      5: (26, 22, 19), 6: (27, 24, 21), 7: (29, 25, 22), 8: (30, 26, 23), 9: (32, 28, 25), 10: (33, 29, 26),
      11: (34, 30, 27), 12: (36, 32, 29), 13: (37, 33, 30), 14: (39, 34, 31), 15: (40, 36, 33), 16: (41, 37, 34),
      17: (43, 38, 35), 18: (44, 40, 37), 19: (46, 41, 38), 20: (47, 42, 39)}
DMG = {-1: (4, 4, 3, 2), 0: (6, 6, 5, 4), 1: (10, 8, 6, 5), 2: (13, 11, 9, 8), 3: (18, 15, 12, 10), 4: (22, 18, 14, 12),
       5: (26, 20, 16, 13), 6: (28, 23, 18, 15), 7: (32, 25, 20, 17), 8: (35, 28, 22, 18), 9: (37, 30, 24, 20),
       10: (41, 33, 26, 22), 11: (43, 35, 28, 23), 12: (46, 37, 30, 25), 13: (50, 40, 32, 27), 14: (53, 42, 34, 28),
       15: (57, 45, 36, 30), 16: (60, 47, 37, 31), 17: (62, 50, 38, 32), 18: (65, 52, 40, 33), 19: (69, 55, 42, 35),
       20: (71, 57, 44, 37)}   # extreme, high, moderate, low averages
HIGH_ATTACK = {k: v[1] for k, v in ATTACK.items()}
GRADE_DICE = {'commercial': 1, 'tactical': 1, 'advanced': 2, 'superior': 2, 'elite': 3, 'ultimate': 3, 'paragon': 4}
MOD = 'mass-effect-sf2e-conversion'


def clamp(level):
    return max(-1, min(20, level))


def shift(value, table, old, new, integer=True):
    """Keep `value` in the band it is closest to at `old`, with the same offset, at `new`."""
    row_old, row_new = table[clamp(old)], table[clamp(new)]
    band = min(range(len(row_old)), key=lambda b: abs(value - row_old[b]))
    out = row_new[band] + (value - row_old[band])
    return round(out) if integer else out


def dmg_ratio(old, new):
    return DMG[clamp(new)][2] / DMG[clamp(old)][2]


def scale_roll(formula, ratio):
    """Scale every XdY(+Z) in a formula by the moderate-damage ratio, keeping die sizes."""
    def one(m):
        n, die, sign, flat = int(m[1]), int(m[2]), m[3] or '+', int(m[4] or 0)
        flat = flat if sign == '+' else -flat
        target = (n * (die + 1) / 2 + flat) * ratio
        n2 = max(1, round(n * ratio))
        f2 = round(target - n2 * (die + 1) / 2)
        return f'{n2}d{die}' + (f'+{f2}' if f2 > 0 else f'{f2}' if f2 < 0 else '')
    return re.sub(r'(\d+)d(\d+)(?:([+-])(\d+)(?![d\d]))?', one, formula)


def striking_for(level):
    return 0 if level < 4 else 1 if level < 12 else 2 if level < 19 else 3


def weapon_strike(strike, weapon, level):
    s = weapon['system']
    lvl = clamp(level)
    base = s['damage']['dice']
    dice = base + striking_for(level) if base != 1 else max(GRADE_DICE.get(s.get('grade') or 'commercial', 1),
                                                           1 + max(s['runes'].get('striking', 0), striking_for(level)))
    die = s['damage']['die']
    dice_avg = dice * (int(die[1:]) + 1) / 2
    flat = max(0, min(math.ceil(DMG[lvl][2] / 2), math.floor(DMG[lvl][0] - dice_avg)))
    st = strike['system']
    st['bonus'] = {'value': HIGH_ATTACK[lvl] + (s['runes'].get('potency') or 0)}
    key = next(iter(st.get('damageRolls') or {}), 'dmg0')
    st['damageRolls'] = {key: {'damage': f'{dice}{die}+{flat}', 'damageType': s['damage']['damageType'], 'category': None}}


def rescale_text(html, old, new):
    if not html:
        return html
    ratio = dmg_ratio(old, new)
    html = re.sub(r'(?<![\w|])DC (\d+)', lambda m: f'DC {shift(int(m[1]), DC, old, new)}', html)
    html = re.sub(r'(\|dc:)(\d+)', lambda m: f'{m[1]}{shift(int(m[2]), DC, old, new)}', html)
    html = re.sub(r'@Damage\[([^\]]*?(?:\[[^\]]*\])?[^\]]*)\]',
                  lambda m: m[0] if '@actor' in m[1] else f'@Damage[{scale_roll(m[1], ratio)}]', html)
    html = re.sub(r'\[\[/(r|br) ([^\]#]*?)( #[^\]]*)?\]\]',
                  lambda m: m[0] if m[1] == 'br' and 'recharge' in (m[3] or '').lower()
                  else f'[[/{m[1]} {scale_roll(m[2], ratio)}{m[3] or ""}]]', html)
    return html


def rescale(actor, new):
    s = actor['system']
    old = s['details']['level']['value']
    if old == new:
        return []
    log = [f'level {old} -> {new}']
    s['details']['level']['value'] = new
    a = s['attributes']
    a['ac']['value'] = shift(a['ac']['value'], AC, old, new)
    hp = max(1, shift(a['hp']['max'], HP, old, new))
    a['hp'].update(max=hp, value=hp)
    s['perception']['mod'] = shift(s['perception']['mod'], SAVE, old, new)
    for v in s['saves'].values():
        v['value'] = shift(v['value'], SAVE, old, new)
    for v in (s.get('skills') or {}).values():
        v['base'] = shift(v['base'], SKILL, old, new)
    for v in s['abilities'].values():
        if v['mod'] >= ATTR[clamp(old)][3] - 1:        # leave deliberate dump stats alone
            v['mod'] = shift(v['mod'], ATTR, old, new)
    log.append(f'AC {a["ac"]["value"]}  HP {hp}  Perception {s["perception"]["mod"]}  saves '
               f'{[v["value"] for v in s["saves"].values()]}')
    items = {i['_id']: i for i in actor['items']}
    ratio = dmg_ratio(old, new)
    for it in actor['items']:
        if it['type'] == 'melee':
            linked = items.get((it.get('flags', {}).get('pf2e') or {}).get('linkedWeapon'))
            if linked and linked['type'] == 'weapon':
                weapon_strike(it, linked, new)
            else:
                it['system']['bonus']['value'] = shift(it['system']['bonus']['value'], ATTACK, old, new)
                for r in it['system']['damageRolls'].values():
                    r['damage'] = scale_roll(r['damage'], ratio)
            dmg = ' + '.join(r['damage'] for r in it['system']['damageRolls'].values())
            log.append(f'  {it["name"]}: +{it["system"]["bonus"]["value"]} {dmg}')
        if it['type'] in ('action', 'melee'):
            d = it['system'].get('description') or {}
            if d.get('value'):
                d['value'] = rescale_text(d['value'], old, new)
    det = s['details']
    if det.get('publicNotes'):
        det['publicNotes'] = rescale_text(det['publicNotes'], old, new)
    return log


if __name__ == '__main__':
    path, level = sys.argv[1], int(sys.argv[2])
    raw = open(path, 'rb').read()
    actor = json.loads(raw.decode('utf-8'))
    for line in rescale(actor, level):
        print(line)
    if '--dry-run' not in sys.argv:
        text = json.dumps(actor, indent=2, ensure_ascii=False)
        if b'\r\n' in raw:
            text = text.replace('\n', '\r\n')
        open(path, 'w', encoding='utf-8', newline='').write(text)
