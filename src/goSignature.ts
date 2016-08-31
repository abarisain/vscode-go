/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';

import cp = require('child_process');
import path = require('path');
import { getBinPath } from './goPath';
import { languages, window, commands, SignatureHelpProvider, SignatureHelp, SignatureInformation, ParameterInformation, TextDocument, Position, Range, CancellationToken } from 'vscode';
import { definitionLocation } from './goDeclaration';
import { parameters } from './util';

export class GoSignatureHelpProvider implements SignatureHelpProvider {

	public provideSignatureHelp(document: TextDocument, position: Position, token: CancellationToken): Promise<SignatureHelp> {
		let theCall = this.walkBackwardsToBeginningOfCall(document, position);
		if (theCall == null) {
			return Promise.resolve(null);
		}
		let callerPos = this.previousTokenPosition(document, theCall.openParen);
		return definitionLocation(document, callerPos).then(res => {
			if (!res) {
				// The definition was not found
				return null;
			}
			if (res.line === callerPos.line) {
				// This must be a function definition
				return null;
			}
			let result = new SignatureHelp();
			let decl = res.info.decl.substring(5); // 'func '
			let cutIndex = decl.indexOf(res.info.name + '('); // Find 'functionname(' to remove anything before it
			if (cutIndex !== -1) {
				cutIndex += res.info.name.length; // no need to +1 for the (
			} else {
				cutIndex = res.info.name.length; // try to do our best
			}
			let sig = decl.substring(cutIndex); // Remove the func name
			let si = new SignatureInformation(decl, res.info.doc);
			si.parameters = parameters(sig).map(paramText =>
				new ParameterInformation(paramText)
			);
			result.signatures = [si];
			result.activeSignature = 0;
			result.activeParameter = Math.min(theCall.commas.length, si.parameters.length - 1);
			return result;
		});
	}

	protected previousTokenPosition(document: TextDocument, position: Position): Position {
		while (position.character > 0) {
			let word = document.getWordRangeAtPosition(position);
			if (word) {
				return word.start;
			}
			position = position.translate(0, -1);
		}
		return null;
	}

	protected walkBackwardsToBeginningOfCall(document: TextDocument, position: Position): { openParen: Position, commas: Position[] } {
		let currentLine = document.lineAt(position.line).text.substring(0, position.character);
		let parenBalance = 0;
		let commas = [];
		for (let char = position.character; char >= 0; char--) {
			switch (currentLine[char]) {
				case '(':
					parenBalance--;
					if (parenBalance < 0) {
						return {
							openParen: new Position(position.line, char),
							commas: commas
						};
					}
					break;
				case ')':
					parenBalance++;
					break;
				case ',':
					if (parenBalance === 0) {
						commas.push(new Position(position.line, char));
					}
			}
		}
		return null;
	}

}
