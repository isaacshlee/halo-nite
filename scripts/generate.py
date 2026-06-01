"""
Reads S6 Carnage Report.xlsx and outputs docs/data/stats.json.
Run after each session: python scripts/generate.py
"""
import pandas as pd
import json
from pathlib import Path

ROOT = Path(__file__).parent.parent
EXCEL_PATH = ROOT / 'data' / 'S6 Carnage Report.xlsx'
OUTPUT_PATH = ROOT / 'docs' / 'data' / 'stats.json'

TEAM_NAMES = {0: 'Red', 1: 'Blue', 2: 'Green', 7: 'Pink', 5: 'Gold', 6: 'Brown'}
MATCHUP_NAMES = {1: 'Blue vs Red', 2: 'Pink vs Green', 3: 'Gold vs Brown'}

TEAM_COLORS = {
    'Red': '#ff4444', 'Blue': '#4488ff', 'Green': '#44dd88',
    'Pink': '#ff88cc', 'Gold': '#ffcc00', 'Brown': '#cc8855',
}

DISPLAY_NAMES = {
    'BrundonDru': 'Brundo',
    'HDTurkie': 'Turkie',
    'IKEMAN2684': 'Ike',
    'walsh696969': 'Walsh',
}

NAMED_MEDALS = [
    'Assist', 'Avenger', 'Close Call', 'Comeback Kill', 'Double Kill',
    'First Strike', 'Grenade Kill', 'Headshot', 'Kill', 'Kill from the Grave',
    'Killing Frenzy', 'Killing Spree', 'Killjoy', 'Last Strike', 'Melee Kill',
    'Protector', 'Reload This', 'Revenge', 'Rocket Kill', 'Sentinel Beam Kill',
    'Snapshot', 'Sniper Spree', 'Triple Double', 'Sniper Kill',
]


def _int(val):
    try:
        v = val if val == val else 0  # NaN guard
        return int(v) if v is not None else 0
    except (TypeError, ValueError):
        return 0


def _float(val):
    try:
        f = float(val) if val == val else 0.0
        return round(f, 3)
    except (TypeError, ValueError):
        return 0.0


def _str(val):
    return str(val) if val is not None and val == val else ''


def get_players(df):
    return [c.replace('_Kills', '') for c in df.columns if c.endswith('_Kills')]


def build_games(df, players):
    games = []
    for _, row in df.iterrows():
        wt_code = _int(row.get('Winning_Team'))
        lt_code = _int(row.get('Losing_Team'))
        mu_code = _int(row.get('Matchup'))
        map_name = _str(row.get('Map_Manual')) or _str(row.get('Map')) or 'Unknown'

        game = {
            'halonite_num_season': _int(row.get('Halonite_Num_Season')),
            'game_num_season': _int(row.get('Game_Num_Season')),
            'game_num_nite': _int(row.get('Game_Num_Nite')),
            'matchup': MATCHUP_NAMES.get(mu_code, f'Matchup {mu_code}'),
            'matchup_code': mu_code,
            'winning_team': TEAM_NAMES.get(wt_code, str(wt_code)),
            'losing_team': TEAM_NAMES.get(lt_code, str(lt_code)),
            'map': map_name,
            'timestamp': _str(row.get('Timestamp')),
            'players': {},
        }

        for p in players:
            medals = {}
            for m in NAMED_MEDALS:
                v = _int(row.get(f'{p}_{m}'))
                if v > 0:
                    medals[m] = v

            tc = _int(row.get(f'{p}_Team'))
            game['players'][p] = {
                'team': TEAM_NAMES.get(tc, str(tc)),
                'team_code': tc,
                'kills': _int(row.get(f'{p}_Kills')),
                'deaths': _int(row.get(f'{p}_Deaths')),
                'assists': _int(row.get(f'{p}_Assists')),
                'kdr': _float(row.get(f'{p}_KDR')),
                'score': _int(row.get(f'{p}_Score')),
                'most_kills_in_row': _int(row.get(f'{p}_MostKillsInARow')),
                'total_medals': _int(row.get(f'{p}_TotalMedalCount')),
                'medals': medals,
            }

        games.append(game)
    return games


def build_aggregates(games, players):
    acc = {p: dict(
        games=0, wins=0, losses=0,
        total_kills=0, total_deaths=0, total_assists=0, total_medals=0,
        best_kills=0, best_kdr=0.0,
        kills_per_game=[], kdr_per_game=[], game_labels=[],
        medal_totals={},
    ) for p in players}

    for g in games:
        wt = g['winning_team']
        label = f"G{g['game_num_season']}"
        for p in players:
            ps = g['players'].get(p)
            if not ps:
                continue
            a = acc[p]
            a['games'] += 1
            if ps['team'] == wt:
                a['wins'] += 1
            else:
                a['losses'] += 1
            a['total_kills'] += ps['kills']
            a['total_deaths'] += ps['deaths']
            a['total_assists'] += ps['assists']
            a['total_medals'] += ps['total_medals']
            a['best_kills'] = max(a['best_kills'], ps['kills'])
            a['best_kdr'] = max(a['best_kdr'], ps['kdr'])
            a['kills_per_game'].append(ps['kills'])
            a['kdr_per_game'].append(ps['kdr'])
            a['game_labels'].append(label)
            for medal, cnt in ps['medals'].items():
                a['medal_totals'][medal] = a['medal_totals'].get(medal, 0) + cnt

    result = {}
    for p in players:
        a = acc[p]
        gp = a['games'] or 1
        td = a['total_deaths'] or 1
        result[p] = {
            'games': a['games'],
            'wins': a['wins'],
            'losses': a['losses'],
            'win_pct': round(a['wins'] / gp * 100, 1),
            'total_kills': a['total_kills'],
            'total_deaths': a['total_deaths'],
            'total_assists': a['total_assists'],
            'total_medals': a['total_medals'],
            'kdr': round(a['total_kills'] / td, 3),
            'avg_kills': round(a['total_kills'] / gp, 2),
            'avg_deaths': round(a['total_deaths'] / gp, 2),
            'best_kills': a['best_kills'],
            'best_kdr': round(a['best_kdr'], 3),
            'kills_per_game': a['kills_per_game'],
            'kdr_per_game': a['kdr_per_game'],
            'game_labels': a['game_labels'],
            'top_medals': sorted(a['medal_totals'].items(), key=lambda x: -x[1])[:8],
        }
    return result


def build_teams(games, players):
    teams = {}
    for g in games:
        for side in ['winning_team', 'losing_team']:
            t = g[side]
            if t not in teams:
                teams[t] = dict(wins=0, losses=0, games=0, total_kills=0, total_deaths=0)
        teams[g['winning_team']]['wins'] += 1
        teams[g['winning_team']]['games'] += 1
        teams[g['losing_team']]['losses'] += 1
        teams[g['losing_team']]['games'] += 1
        for p, ps in g['players'].items():
            t = ps['team']
            if t in teams:
                teams[t]['total_kills'] += ps['kills']
                teams[t]['total_deaths'] += ps['deaths']

    result = {}
    for t, d in teams.items():
        g = d['games'] or 1
        result[t] = {
            'color': TEAM_COLORS.get(t, '#aaaaaa'),
            'wins': d['wins'],
            'losses': d['losses'],
            'games': d['games'],
            'win_pct': round(d['wins'] / g * 100, 1),
            'avg_kills': round(d['total_kills'] / g, 1),
            'avg_deaths': round(d['total_deaths'] / g, 1),
        }
    return result


def build_matchups(games):
    matchups = {}
    for g in games:
        m = g['matchup']
        if m not in matchups:
            parts = m.split(' vs ')
            matchups[m] = {
                'team_a': parts[0] if len(parts) == 2 else '',
                'team_b': parts[1] if len(parts) == 2 else '',
                'team_a_wins': 0,
                'team_b_wins': 0,
                'games': 0,
            }
        matchups[m]['games'] += 1
        wt = g['winning_team']
        if wt == matchups[m]['team_a']:
            matchups[m]['team_a_wins'] += 1
        elif wt == matchups[m]['team_b']:
            matchups[m]['team_b_wins'] += 1
    return matchups


def build_maps(games, players):
    maps = {}
    for g in games:
        mn = g['map']
        if not mn or mn == 'Unknown':
            continue
        if mn not in maps:
            maps[mn] = dict(
                games=0, total_kills=0, total_deaths=0,
                player_kills={p: 0 for p in players},
                player_games={p: 0 for p in players},
            )
        m = maps[mn]
        m['games'] += 1
        for p in players:
            ps = g['players'].get(p)
            if not ps:
                continue
            m['total_kills'] += ps['kills']
            m['total_deaths'] += ps['deaths']
            m['player_kills'][p] += ps['kills']
            m['player_games'][p] += 1

    result = {}
    for mn, m in sorted(maps.items(), key=lambda x: -x[1]['games']):
        g = m['games'] or 1
        n = len(players)
        player_avg = {p: round(m['player_kills'][p] / (m['player_games'][p] or 1), 2) for p in players}
        result[mn] = {
            'games': m['games'],
            'avg_kills_per_player': round(m['total_kills'] / g / n, 2),
            'avg_deaths_per_player': round(m['total_deaths'] / g / n, 2),
            'player_avg_kills': player_avg,
            'top_player': max(player_avg, key=player_avg.get),
        }
    return result


def build_records(games, players):
    slots = {
        'most_kills':        ('kills', 'Most Kills in a Game'),
        'best_kdr':          ('kdr', 'Best KDR in a Game'),
        'longest_streak':    ('most_kills_in_row', 'Longest Kill Streak'),
        'most_medals':       ('total_medals', 'Most Medals in a Game'),
        'most_assists':      ('assists', 'Most Assists in a Game'),
    }
    medal_slots = {
        'most_double_kills': ('Double Kill', 'Most Double Kills in a Game'),
        'most_headshots':    ('Headshot', 'Most Headshots in a Game'),
        'most_sniper_kills': ('Sniper Kill', 'Most Sniper Kills in a Game'),
    }

    records = {k: {'label': v[1], 'player': '', 'display': '', 'value': 0, 'game_num': 0, 'map': ''}
               for k, v in {**slots, **medal_slots}.items()}

    def check(key, player, value, gnum, gmap):
        if value > records[key]['value']:
            records[key].update(player=player, display=DISPLAY_NAMES.get(player, player),
                                value=value, game_num=gnum, map=gmap)

    for g in games:
        gn = g['game_num_season']
        gm = g['map']
        for p in players:
            ps = g['players'].get(p)
            if not ps:
                continue
            for key, (field, _) in slots.items():
                check(key, p, _float(ps[field]) if field == 'kdr' else _int(ps[field]), gn, gm)
            for key, (medal, _) in medal_slots.items():
                check(key, p, ps['medals'].get(medal, 0), gn, gm)

    return records


def main():
    df = pd.read_excel(EXCEL_PATH, engine='openpyxl')
    df = df[df['Game_Num_Season'].notna()]

    players = get_players(df)
    print(f'Players detected: {players}')
    print(f'Games loaded:     {len(df)}')

    games = build_games(df, players)
    out = {
        'season': 6,
        'players': players,
        'display_names': DISPLAY_NAMES,
        'team_colors': TEAM_COLORS,
        'games': games,
        'aggregates': build_aggregates(games, players),
        'teams': build_teams(games, players),
        'matchups': build_matchups(games),
        'maps': build_maps(games, players),
        'records': build_records(games, players),
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, 'w') as f:
        json.dump(out, f, indent=2, default=str)
    print(f'Output:           {OUTPUT_PATH}')


if __name__ == '__main__':
    main()
