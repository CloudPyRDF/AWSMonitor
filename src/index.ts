import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import {
    ToolbarButton
} from '@jupyterlab/apputils';

import { DocumentRegistry } from '@jupyterlab/docregistry';

import { ICellModel, isCodeCellModel } from "@jupyterlab/cells";

import { NotebookActions, NotebookPanel, INotebookModel } from '@jupyterlab/notebook';

import { IDisposable } from '@lumino/disposable';

import { ISettingRegistry } from '@jupyterlab/settingregistry';

export class ButtonExtension implements DocumentRegistry.IWidgetExtension<NotebookPanel, INotebookModel> {

    createNew(panel: NotebookPanel, context: DocumentRegistry.IContext<INotebookModel>): IDisposable {
		// Create the toolbar button
		let monitorButton = new ToolbarButton({
			label: 'Monitor',
			onClick: () => this.showAWSMonitor(panel)
		});

		// Add the toolbar button to the notebook toolbar
		panel.toolbar.addItem('Monitor', monitorButton);

		// The ToolbarButton class implements `IDisposable`, so the
		// button *is* the extension for the purposes of this method.
		return monitorButton;
	}

    async showAWSMonitor(panel: NotebookPanel): Promise<any> {
        const notebook = panel.content;
            const newCell = notebook.model?.contentFactory.createCodeCell({});


            let oldIndex = notebook.activeCellIndex;
    
            notebook.model.cells.insert(0, newCell);
            notebook.activeCellIndex = 0;
    
    
            //notebook.activeCell.hide();
    
            const cell: ICellModel = notebook.model.cells.get(0);
            if (!isCodeCellModel(cell)) {
            throw new Error("cell is not a code cell.");
            }
    
            cell.value.text = "from IPython.core.display import display, HTML\ndisplay(HTML('<div style=\"display: flex; justify-content: center; align-items: center\"><div style=\"height: 200px; width: 500px;\"><div style=\"height: 35px; width: 495px; background-color: #ffb029; display: flex; flex-direction: row; justify-content: left; align-items: center; padding-left: 5px\"><text style=\"font-weight: 900; margin-right: 30px\">AWSMonitor</text><text style=\"font-weight: 900\">Partitions: 64</text></div><div style=\"height: 35px; width: 440px; background-color: #d6d6d6; display: flex; flex-direction: row; justify-content: space-between; align-items: center;padding-left: 30px; padding-right: 30px\"><text style=\"font-weight: 900;\">Status</text><text style=\"font-weight: 900\">Progress</text><text style=\"font-weight: 900\">Duration</text></div><div style=\"height: 35px; width: 440px; display: flex; flex-direction: row; justify-content: space-between; align-items: center; margin-top: 10px; padding-left: 30px; padding-right: 30px\"><text style=\"font-weight: 900;\">Created</text><div style=\"height: 25px; width: 250px; border-style: solid; background-color: #d6d6d6\"><div style=\"height: 25px; width: 200px; background-color: #80d2ff\"></div></div><text style=\"font-weight: 900;\">6000 ms</text>	</div><div style=\"height: 5px; width: 500px; margin-top: 10px; background-color: #d6d6d6\"></div><div style=\"height: 35px; width: 440px; display: flex; flex-direction: row; justify-content: space-between; align-items: center; margin-top: 10px; padding-left: 30px; padding-right: 30px\"><text style=\"font-weight: 900;\">Finished</text><div style=\"height: 25px; width: 250px; border-style: solid; background-color: #d6d6d6\"><div style=\"height: 25px; width: 100px; background-color: #5bfc60\"></div></div><text style=\"font-weight: 900;\">2000 ms</text>	</div></div></div>'))";
    
            await NotebookActions.run(notebook, panel.sessionContext);
            
            //console.log(cell.outputs.get(0));
    
            //notebook.model.cells.remove(0);
            notebook.activeCellIndex = oldIndex;
		
    }

}



/**
 * Initialization data for the AWSMonitor extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'AWSMonitor:plugin',
  autoStart: true,
  optional: [ISettingRegistry],
  activate: (app: JupyterFrontEnd, settingRegistry: ISettingRegistry | null) => {
    console.log('JupyterLab extension AWSMonitor is activated!');
    const monitorButton = new ButtonExtension();
	app.docRegistry.addWidgetExtension('Notebook', monitorButton);

    if (settingRegistry) {
      settingRegistry
        .load(plugin.id)
        .then(settings => {
          console.log('AWSMonitor settings loaded:', settings.composite);
        })
        .catch(reason => {
          console.error('Failed to load settings for AWSMonitor.', reason);
        });
    }
  }
};

export default plugin;
