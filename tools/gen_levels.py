#!/usr/bin/env python3
"""Color Pour - 레벨 생성기 (검증 포함).

규칙: 튜브 용량 4. 같은 색 4개가 한 튜브에 모이면 완성.
각 레벨은 무작위 배치 후 솔버로 '풀 수 있음'을 검증하고,
솔버가 찾은 해의 길이를 '기준 이동수(par)'로 저장한다.
"""
import argparse
import heapq
import json
import random
from pathlib import Path

CAP = 4


def is_solved(state):
    return all(len(t) == 0 or (len(t) == CAP and len(set(t)) == 1) for t in state)


def blocks(tube):
    if not tube:
        return 0
    return 1 + sum(1 for i in range(1, len(tube)) if tube[i] != tube[i - 1])


def heur(state):
    b = sum(blocks(t) for t in state)
    ne = sum(1 for t in state if t)
    return b - ne


def legal_moves(state):
    n = len(state)
    moves = []
    for i in range(n):
        a = state[i]
        if not a:
            continue
        col = a[-1]
        k = 1
        while k < len(a) and a[-1 - k] == col:
            k += 1
        uniform = len(set(a)) == 1
        for j in range(n):
            if i == j:
                continue
            b = state[j]
            if len(b) >= CAP:
                continue
            if b and b[-1] != col:
                continue
            if not b and uniform:
                # 한 가지 색으로만 채워진 튜브를 빈 튜브로 통째로 옮기는 것은 무의미
                continue
            moves.append((i, j, min(k, CAP - len(b))))
    return moves


def apply_move(state, i, j, cnt):
    s = list(state)
    a = list(s[i])
    b = list(s[j])
    for _ in range(cnt):
        b.append(a.pop())
    s[i] = tuple(a)
    s[j] = tuple(b)
    return tuple(s)


def solve(state, node_cap=250_000):
    """가중 A* 탐색. 해를 찾으면 이동 리스트 반환, 실패 시 None."""
    if is_solved(state):
        return []
    start = tuple(tuple(t) for t in state)
    best_g = {canonical(start): 0}
    h = heur(start)
    pq = [(3 * h, 0, h, start, [])]
    nodes = 0
    counter = 0
    while pq:
        f, g, hh, st, path = heapq.heappop(pq)
        nodes += 1
        if nodes > node_cap:
            return None
        for (i, j, cnt) in legal_moves(st):
            ns = apply_move(st, i, j, cnt)
            ng = g + 1
            if is_solved(ns):
                return path + [(i, j)]
            ck = canonical(ns)
            if ck in best_g and best_g[ck] <= ng:
                continue
            best_g[ck] = ng
            nh = heur(ns)
            counter += 1
            heapq.heappush(pq, (ng * 2 + nh * 3, ng, nh, ns, path + [(i, j)]))
    return None


def replay(state, sol):
    s = tuple(tuple(t) for t in state)
    for (i, j) in sol:
        a = s[i]
        col = a[-1]
        k = 1
        while k < len(a) and a[-1 - k] == col:
            k += 1
        cnt = min(k, CAP - len(s[j]))
        if cnt <= 0 or (s[j] and s[j][-1] != col):
            return None
        s = apply_move(s, i, j, cnt)
    return s


def canonical(state):
    return tuple(sorted(state))


def make_raw(colors, empties, rng):
    balls = []
    for c in range(colors):
        balls.extend([c] * CAP)
    rng.shuffle(balls)
    tubes = []
    idx = 0
    for _ in range(colors):
        tubes.append(tuple(balls[idx:idx + CAP]))
        idx += CAP
    for _ in range(empties):
        tubes.append(())
    return tuple(tubes)


CFG = [
    # (최대 레벨, 색 수, 빈 튜브 수)
    (6, 3, 2),
    (12, 3, 2),
    (20, 4, 2),
    (30, 4, 2),
    (40, 5, 2),
    (50, 5, 2),
    (60, 6, 2),
    (70, 6, 2),
    (80, 7, 2),
    (90, 8, 2),
    (100, 9, 2),
    (110, 10, 2),
    (120, 11, 2),
]


def cfg_for(n):
    for maxn, colors, empties in CFG:
        if n <= maxn:
            return colors, empties
    return 11, 2


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--levels", type=int, default=120)
    ap.add_argument("--seed", type=int, default=20261121)
    ap.add_argument("--out", default="app/src/main/assets/levels.js")
    args = ap.parse_args()

    rng = random.Random(args.seed)
    out = []
    for n in range(1, args.levels + 1):
        colors, empties = cfg_for(n)
        sol = None
        state = None
        tries = 0
        while sol is None and tries < 40:
            tries += 1
            state = make_raw(colors, empties, rng)
            sol = solve(state)
            if sol is None:
                continue
            # 너무 쉬운 레벨(해가 짧음)은 다시 뽑는다
            if n >= 25 and len(sol) < colors * 3:
                sol = None
        if sol is None:
            raise SystemExit(f"레벨 {n} 생성 실패 (colors={colors})")
        end = replay(state, sol)
        if end is None or not is_solved(end):
            raise SystemExit(f"레벨 {n} 해 검증 실패")
        out.append({
            "n": n,
            "t": [list(t) for t in state],
            "s": [list(m) for m in sol],
            "p": len(sol),
        })
        print(f"level {n:3d} colors={colors:2d} tubes={len(state)} par={len(sol):3d} tries={tries}")

    js = "window.LEVELS = " + json.dumps(out, separators=(",", ":")) + ";\n"
    p = Path(args.out)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(js, encoding="utf-8")
    print(f"wrote {p} ({len(js)} bytes)")


if __name__ == "__main__":
    main()
