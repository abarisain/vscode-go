/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------*/

'use strict';

import { HoverProvider, Hover, MarkedString, TextDocument, Position, CancellationToken } from 'vscode';
import { definitionLocation } from './goDeclaration';

export class GoHoverProvider implements HoverProvider {
	public provideHover(document: TextDocument, position: Position, token: CancellationToken): Thenable<Hover> {
		return definitionLocation(document, position).then(definitionInfo => {
			if (definitionInfo == null) return null;
			let hoverTexts: MarkedString[] = [];
			if (definitionInfo.info.doc != null) {
				hoverTexts.push(definitionInfo.info.doc);
			}
			hoverTexts.push({ language: 'go', value: definitionInfo.info.decl});
			let hover = new Hover(hoverTexts);
			return hover;
		});
	}
}
