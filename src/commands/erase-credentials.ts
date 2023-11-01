import { ExtensionContext, window } from 'vscode';

import utils from '../utils';


/**
 * Erase stored ForceGPT credentials.
 * @param {vscode.ExtensionContext} context - Extension context.
 */
const execute = (context: ExtensionContext): void => {

	try {

		utils.eraseCredentials(context);

	} catch(error: any) {
		console.error(error);
		window.showErrorMessage(error.message);
	}

};

export default {
	execute
};