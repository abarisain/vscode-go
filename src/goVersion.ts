/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------*/

'use strict';

import cp = require('child_process');
import semver = require('semver');

// Volountarily ignore "rcX". We don't need that kind of granularity for now
const goVersionRegexp = /^go version go([\.\d]*)(?:rc\d*)? .*$/m;
let versionCache: string = null;

export function getGoVersion(skipCache: boolean = true): Promise<string> {
	return new Promise((resolve, reject) => {
		if (!skipCache && versionCache !== null) {
			resolve(versionCache);
		}

		cp.exec('go version', { env: process.env }, (err, stdout, stderr) => {
			if (err) {
				reject(err);
				return;
			}

			let match = goVersionRegexp.exec(stdout.toString());
			if (!match) {
				reject('unreadable output');
				return;
			}

			versionCache = match[1];
			resolve(versionCache);
		});
	});
}

export function isGoVersionAtLeast(wantedVersion: string, skipCache: boolean = true): Promise<boolean> {
	return new Promise((resolve, reject) => {
		getGoVersion(skipCache).then((res) => {
			// Add a patch version if needed to make semver happy
			if (!/^\d\.\d\.\d$/.test(res)) {
				res += '.0';
			}
			resolve(semver.gte(res, wantedVersion, true));
		}, (reason) => {
			reject(reason);
		});
	});
}