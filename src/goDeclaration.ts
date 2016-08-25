/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------*/

'use strict';

import vscode = require('vscode');
import cp = require('child_process');
import path = require('path');
import { getBinPath } from './goPath';
import { byteOffsetAt } from './util';
import { promptForMissingTool } from './goInstallTools';

export interface GoDefinitionInformation {
	file: string;
	line: number;
	col: number;
	info: GogetdocMethodInformation;
}

interface GogetdocMethodInformation {
	name: string;
	import: string;
	decl: string;
	doc: string;
	pos: string;
}

export function definitionLocation(document: vscode.TextDocument, position: vscode.Position): Promise<GoDefinitionInformation> {
	return new Promise<GoDefinitionInformation>((resolve, reject) => {

		let wordAtPosition = document.getWordRangeAtPosition(position);
		let offset = byteOffsetAt(document, position);

		let gogetdoc = getBinPath('gogetdoc');
		let fullPos = document.fileName + ':#' + offset.toString();
		let docP = cp.execFile(gogetdoc, ['-json', '-modified', '-pos', fullPos], {}, (err, stdout, stderr) => {
			try {
				if (err && (<any>err).code === 'ENOENT') {
					promptForMissingTool('gogetdoc');
				}
				if (err) return resolve(null);

				let result = <GogetdocMethodInformation>JSON.parse(stdout.toString());

				let match = /(.*):(\d+):(\d+)/.exec(result.pos);
				if (!match) {
					// TODO: Gotodef on pkg name:
					// /usr/local/go/src/html/template\n
					return resolve({
						file: null,
						line: null,
						col: null,
						info: result
					});
				}
				let [_, file, line, col] = match;

				let definitionInformation: GoDefinitionInformation = {
					file: file,
					line: +line - 1,
					col: + col - 1,
					info: result
				};

				return resolve(definitionInformation);
			} catch (e) {
				reject(e);
			}
		});

		// gogetdoc excepts stdin formatted in an archive format
		let documentText = document.getText();
		let documentArchive = document.fileName + "\n";
		documentArchive = documentArchive + Buffer.byteLength(documentText) + "\n";
		documentArchive = documentArchive + documentText;
		docP.stdin.end(documentArchive);
	});
}

export class GoDefinitionProvider implements vscode.DefinitionProvider {

	public provideDefinition(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): Thenable<vscode.Location> {
		return definitionLocation(document, position).then(definitionInfo => {
			if (definitionInfo == null) return null;
			let definitionResource = vscode.Uri.file(definitionInfo.file);
			let pos = new vscode.Position(definitionInfo.line, definitionInfo.col);
			return new vscode.Location(definitionResource, pos);
		});
	}

}
