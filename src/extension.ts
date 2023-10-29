// The module 'vscode' contains the VS Code extensibility API
import * as vscode from 'vscode';

import setCredentials from './commands/set-credentials';
import generateApexClass from './commands/generate-apex-class';
import modifyApexClass from './commands/modify-apex-class';
import generateApexTest from './commands/generate-apex-test';

export function activate(context: vscode.ExtensionContext) {

    console.log('ForceGPT is now active');
	
	context.subscriptions.push(vscode.commands.registerCommand('force-gpt.setCredentials', async () => {
		console.log('ForceGPT Command: setCredentials');
		await setCredentials.execute(context);
	}));
	
	context.subscriptions.push(vscode.commands.registerCommand('force-gpt.generateApexClass', async () => {
		console.log('ForceGPT Command: generateApexClass');
		await generateApexClass.execute(context);
	}));
	
	context.subscriptions.push(vscode.commands.registerCommand('force-gpt.modifyApexClass', async (uri: vscode.Uri) => {
		console.log('ForceGPT Command: modifyApexClass');
		await modifyApexClass.execute(context, uri);
	}));
	
	context.subscriptions.push(vscode.commands.registerCommand('force-gpt.generateApexTest', async (uri: vscode.Uri) => {
		console.log('ForceGPT Command: generateApexTest');
		await generateApexTest.execute(context, uri);
	}));

}

// This method is called when your extension is deactivated
// export function deactivate() {}
