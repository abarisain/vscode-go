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
import { GoSignatureHelpProvider } from './goSignature';

export class GoSignatureHelpProviderCompat extends GoSignatureHelpProvider {

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
			let sig = decl.substring(res.info.name.length); // Remove the func name
			let si = new SignatureInformation(decl, res.info.doc); // 'func '
			si.parameters = parameters(sig).map(paramText =>
				new ParameterInformation(paramText)
			);
			result.signatures = [si];
			result.activeSignature = 0;
			result.activeParameter = Math.min(theCall.commas.length, si.parameters.length - 1);
			return result;
		});
	}

}
