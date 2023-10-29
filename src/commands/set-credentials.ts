import { ExtensionContext, window } from 'vscode';

import utils from '../utils';


/**
 * Set ForceGPT credentials for further using the extension.
 * @param {vscode.ExtensionContext} context - Extension context.
 */
const execute = async (context: ExtensionContext): Promise<void> => {

	try {

		const result = await utils.setCredentials(context);
		if(result) {
			window.showInformationMessage('ForceGPT: Credentials saved.');
		}

	} catch(error: any) {
		console.error(error);
		window.showErrorMessage(error.message);
	}

};

export default {
	execute
};