"""Export complete PolyBot replay commands for repeatable renderer benchmarks.

Uses PolyBot's normal selection, validation, telemetry and serialization flow.
The transport writes files only and rejects every simulation/training operation.
Run with PolyBot's Python environment; no game, agent or bridge is started.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--polybot', type=Path, default=Path(__file__).resolve().parents[2] / 'poly-bot')
    parser.add_argument('--run', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--counts', type=int, nargs='+', default=[1, 25, 50, 100, 250, 500])
    parser.add_argument('--min-samples', type=int, default=80)
    parser.add_argument('--max-samples', type=int, default=250)
    args = parser.parse_args()
    if any(not 1 <= count <= 500 for count in args.counts):
        parser.error('counts must be between 1 and 500')
    sys.path.insert(0, str(args.polybot.resolve() / 'src'))
    from polybot.protocol import PROTOCOL_VERSION, success_response
    from polybot.replay_swarm import (
        ColorScale, ReplayPlaybackOptions, ReplaySelection, SelectedReplayPayload,
        evenly_sample_replays, replay_camera_rank, resolve_replay_directories,
        send_replay_swarm,
    )
    from polybot.training.visual_replays import load_replay_episode, load_replay_index

    candidates = [ReplaySelection(directory, entry)
                  for directory in resolve_replay_directories(args.run)
                  for entry in load_replay_index(directory)
                  if args.min_samples <= entry['sample_count'] <= args.max_samples]
    if len(candidates) < max(args.counts):
        parser.error(f'only {len(candidates)} whole recordings match the sample filter')
    scale = ColorScale(maximum_step=max(1, max(item.training_step for item in candidates)))
    args.output.mkdir(parents=True, exist_ok=True)
    reports = []

    class FileTransport:
        def __init__(self, output):
            self.output = output
            self.commands = 0

        def request(self, message):
            operation = message['op']
            if operation == 'hello':
                return success_response(message, {'protocol_version': PROTOCOL_VERSION})
            if not operation.startswith('visual_replay_'):
                raise AssertionError(f'non-renderer operation rejected: {operation}')
            self.output.write(json.dumps({
                'op': operation.removeprefix('visual_replay_'), 'params': message['params'],
            }, separators=(',', ':'), allow_nan=False) + '\n')
            self.commands += 1
            return success_response(message, {})

    for count in sorted(set(args.counts)):
        selected = evenly_sample_replays(candidates, count)
        leader = min(selected, key=replay_camera_rank)
        payloads = [SelectedReplayPayload(item, load_replay_episode(
            item.replay_directory, item.metadata, include_optional=False, include_hud=item is leader,
        ), scale.hex_color(item.training_step)) for item in selected]
        destination = args.output / f'swarm-{count}.jsonl'
        with destination.open('w', encoding='utf-8', newline='\n') as output:
            transport = FileTransport(output)
            send_replay_swarm(transport, action='play', payloads=payloads,
                              options=ReplayPlaybackOptions(speed=1, opacity=1, end_behavior='disappear'))
        with destination.open('rb') as source:
            digest = hashlib.file_digest(source, 'sha256').hexdigest()
        reports.append({
            'count': count, 'file': destination.name, 'sha256': digest,
            'commands': transport.commands, 'leader': next(item.episode_key for item in payloads if item.selection is leader),
            'samples': sum(len(item.payload.samples) for item in payloads),
            'episodes': [{'id': item.episode_key, 'step': item.selection.training_step,
                          'samples': len(item.payload.samples), 'colour': item.color} for item in payloads],
        })
        print(f'{count} cars: {reports[-1]["samples"]} complete samples; {digest}', flush=True)
    (args.output / 'swarm-selection.json').write_text(json.dumps({
        'source': str(args.run), 'minimum_samples': args.min_samples,
        'maximum_samples': args.max_samples, 'colour_maximum_step': scale.maximum_step,
        'cases': reports,
    }, indent=2) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()
