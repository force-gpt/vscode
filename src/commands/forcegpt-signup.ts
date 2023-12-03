import path = require('path');
import { ExtensionContext, Uri, ViewColumn, window } from 'vscode';


/**
 * Set ForceGPT credentials for further using the extension.
 * @param {vscode.ExtensionContext} context - Extension context.
 */
const execute = async (context: ExtensionContext): Promise<void> => {

	try {
		
		// Create and show panel
		const panel = window.createWebviewPanel(
			'forceGptSignup',
			'ForceGPT - Signup',
			ViewColumn.Beside,
			{}
		);

		panel.iconPath = Uri.joinPath(Uri.file(context.extensionPath), 'assets', 'favicon.png');
		panel.webview.options = { enableForms: true, enableScripts: true };
		panel.webview.html = getWebviewContent();

	} catch(error: any) {
		console.error(error);
		window.showErrorMessage(error.message);
	}

};


function getWebviewContent() {
	return `<!DOCTYPE html>
	<html lang="en">
		<style>
			iframe {
				overflow: hidden;
				height: 100%;
				width: 100%;
				position: absolute;
				top: 0px;
				left: 0px;
				right: 0px;
				bottom: 0px;
			}
		</style>
		<body>
			<iframe width="100%" src="${process.env.SERVER_URI ?? 'https://app.force-gpt.com'}/signup" frameborder="0" height="100%" width="100%"></iframe>
		</body>
	</html>`;
}

export default {
	execute
};