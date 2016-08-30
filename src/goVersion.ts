/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------*/

'use strict';

import cp = require('child_process');
import semver = require('semver');

const goVersionRegexp = /^go version go([\.\d]*) .*$/m;
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

export function isGoVersionAtLeast(version: string, skipCache: boolean = true): Promise<boolean> {
	return new Promise((resolve, reject) => {
		getGoVersion(skipCache).then((res) => {
			resolve(semver.gte(version, res, true));
		}, (reason) => {
			reject(reason);
		});
	});
}