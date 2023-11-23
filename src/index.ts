// SPDX-FileCopyrightText: 2023 CyberRex <cyberrex@cbrx.io>
// SPDX-License-Identifier: MIT

// https://qiita.com/YOS0602/items/8eadf8f7743ebdc5946c からコピー
export const format = (str: string, ...args: unknown[]): string => {
	for (const [i, arg] of args.entries()) {
	  const regExp = new RegExp(`\\{${i}\\}`, 'g')
	  str = str.replace(regExp, arg as string)
	}
	return str
}

const postTemplate = '昨日のMisskeyの活動は\n\n\
ノート: {0}({1})\n\
フォロー: {2}({3})\n\
フォロワー: {4}({5})\n\
\n\
でした。\n\
<small>Powered by Cloudflare Workers</small>{6}\
';

export interface Env {
	// Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
	// MY_KV_NAMESPACE: KVNamespace;
	//
	// Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
	// MY_DURABLE_OBJECT: DurableObjectNamespace;
	//
	// Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
	// MY_BUCKET: R2Bucket;
	
	KV: KVNamespace;
	MISSKEY_HOST: string;
	MISSKEY_TOKEN: string;
	POST_VISIBILITY: 'public' | 'home' | 'followers' | 'specified' | undefined;
	POST_TAGS: string[] | undefined;
}

export interface UserProfile {
	id: string;
	followersCount: number;
	followingCount: number;
	notesCount: number;
}

export interface KVUserCountStore {
	followersCount: number;
	followingCount: number;
	notesCount: number;
}

async function saveCount(env: Env, key: string, notesCount: number, followersCount: number, followingCount: number) {
	await env.KV.put(key, JSON.stringify({
		notesCount: notesCount,
		followingCount: followingCount,
		followersCount: followersCount,
	}));
}

async function getProfile(env: Env): Promise<UserProfile> {
	const profreq = await fetch(`https://${env.MISSKEY_HOST}/api/i`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ i: env.MISSKEY_TOKEN }),
	});
	if (!profreq.ok || profreq.status != 200) {
		throw new Error('Failed to fetch profile');
	}
	return await profreq.json();
}

export default {
	async scheduled(
		controller: ScheduledController,
		env: Env,
		ctx: ExecutionContext
	): Promise<void> {

		// Fetch my profile data

		const prof: UserProfile = await getProfile(env);
		const KVS_KEY = `${prof.id}_count`;

		// Get previous day's count from KV
		const kvs: KVUserCountStore | null = await env.KV.get(KVS_KEY, 'json');
		if (kvs !== null) {
			
			// calculate delta and post
			const notesCountDelta = prof.notesCount - kvs.notesCount;
			const followingCountDelta = prof.followingCount - kvs.followingCount;
			const followersCountDelta = prof.followersCount - kvs.followersCount;

			let hashtagstr = '';
			if (env.POST_TAGS) {
				for (let tindex=0; tindex<env.POST_TAGS.length; tindex++) {
					hashtagstr += `#${env.POST_TAGS[tindex]} `;
				}
				hashtagstr = '\n' + hashtagstr.trim();
			}
			
			const text = format(postTemplate,
				prof.notesCount,
				(notesCountDelta >= 0 ? '+' : '-' ) + notesCountDelta,
				prof.followingCount,
				(followingCountDelta >= 0 ? '+' : '-' ) + followingCountDelta,
				prof.followersCount,
				(followersCountDelta >= 0 ? '+' : '-' ) + followersCountDelta,
				hashtagstr
			);

			await fetch(`https://${env.MISSKEY_HOST}/api/notes/create`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					i: env.MISSKEY_TOKEN,
					text,
					visibility: env.POST_VISIBILITY,
				}),
			});
		}

		await saveCount(env, KVS_KEY, prof.notesCount, prof.followersCount, prof.followingCount);
	},
	async fetch(request: Request, env: Env, ctx: ExecutionContext) {
		const url = new URL(request.url);
		if (url.pathname === '/fetch') {
			const res: UserProfile = await getProfile(env);
			const KVS_KEY = `${res.id}_count`;
			await saveCount(env, KVS_KEY, res.notesCount, res.followersCount, res.followingCount);
			return new Response('OK');
		}

		return new Response('Not found', { status: 404 });
	}
};
