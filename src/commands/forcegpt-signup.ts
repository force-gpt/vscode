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

		// Handle messages from the webview
		panel.webview.onDidReceiveMessage(
			async message => {
				if(message.event === 'api_key') {
					
					await context.secrets.store('force-gpt.username', message.username);
					await context.secrets.store('force-gpt.api-key', message.apiKey);

					window.showInformationMessage(`ForceGPT: Credentials for ${message.username} have been correctly stored.`);
				}
			},
			undefined,
			context.subscriptions
		);

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
			<iframe width="100%" src="${process.env.SERVER_URI ?? 'https://app.force-gpt.com'}/signup?getApiKey=1&apiKeyName=VS Code Extension" frameborder="0" height="100%" width="100%"></iframe>
		</body>
		<script>
			// Capture new API key from signup frame and send to extension
			const vscode = acquireVsCodeApi();
			window.addEventListener('message', function(event) {
				
				const signupResult = event.data;
				if(event.origin === '${process.env.SERVER_URI ?? 'https://app.force-gpt.com'}' && signupResult.event === 'forcegpt_signup_result' && signupResult.data.success) {
					const username = signupResult.data.username;
					const apiKey = signupResult.data.apiKey;
					if(username && apiKey) {
						vscode.postMessage({
							event: 'api_key',
							username: username,
							apiKey: apiKey
						})
					}
				}

			});
		</script>
	</html>`;
}

export default {
	execute
};