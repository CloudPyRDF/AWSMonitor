import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { ToolbarButton } from '@jupyterlab/apputils';

import { DocumentRegistry } from '@jupyterlab/docregistry';

import { ICodeCellModel } from '@jupyterlab/cells';

import { ICommMsgMsg } from '@jupyterlab/services/lib/kernel/messages';

import { IKernelConnection } from '@jupyterlab/services/lib/kernel/kernel';

import { ServerConnection } from '@jupyterlab/services';

import { URLExt } from '@jupyterlab/coreutils';

import {
  NotebookPanel,
  INotebookModel,
  INotebookTracker
} from '@jupyterlab/notebook';

import { IDisposable } from '@lumino/disposable';

import { ISettingRegistry } from '@jupyterlab/settingregistry';

export class AWSMonitorExtension
  implements DocumentRegistry.IWidgetExtension<NotebookPanel, INotebookModel>
{
  dialog: HTMLDialogElement;

  dialogOpened: boolean;

  info = '';

  selectedCell: ICodeCellModel;

  selectedCellHTML: Element;

  lastOutput: string;

  monitorHTLM: HTMLDivElement;

  partitions: number;

  created: number;

  finished: number;

  startTime: number;

  kernel: IKernelConnection;

  calculationsFinished = false;

  invokationFinished = false;

  monitorButtonClicked = false;

  monitorInnerHTML = `
  <div id="monitor-outer-wrapper">
    <div id="monitor-wrapper">
      <div id="monitor-header">
        <h1 id="monitor-title-text">AWSMonitor</h1>
        <text id="partitions-text" class="monitor-title">Partitions: </text>
      </div>
      <div id="monitor-column-titles-wrapper" class="monitor-content-wrapper">
		<div id="status-text">
			<text class="monitor-title">Status</text>
		</div>
        <text class="monitor-title">Progress</text>
        <text class="monitor-title">Duration</text>
      </div>
      <div class="monitor-info-row-wrapper monitor-content-wrapper">
        <text class="monitor-title">Created</text>
        <div class="monitor-info-row">
          <div class="monitor-progress-text">
            <text id="created-number"></text>
          </div>
          <div id="created-bar" class="progress-bar">
          </div>
        </div>
        <text id="created-time" class="monitor-title"></text>
      </div>
      <div id="monitor-bars-divider">
      </div>
      <div class="monitor-info-row-wrapper monitor-content-wrapper">
        <text class="monitor-title">Finished</text>
        <div class="monitor-info-row">
          <div class="monitor-progress-text">
            <text id="finished-number"></text>
          </div>
          <div id="finished-bar" class="progress-bar">
          </div>
        </div>
		<div class="finished-time-container">
			<text id="finished-time" class="monitor-title"></text>	
		</div>
      </div>
    </div>
  </div>
  `;

  snackbarHTML = `
  <span class="material-icons-outlined">
    priority_high
  </span>
  <p>
    Insert "#@monitor" in the cell under which you want the monitor to be displayed
  </p>
  `;

  createNew(
    panel: NotebookPanel,
    context: DocumentRegistry.IContext<INotebookModel>
  ): IDisposable {
    this.info = 'Searching for a cell with PyRDF call...';
    this.dialogOpened = false;
    this.partitions = 0;
    this.created = 0;
    this.finished = 0; 
    const monitorButton = new ToolbarButton({
      label: 'AWS Monitor',
      onClick: () => this.searchForCellWithAnnotation(panel)
    });

    this.sendPostRequestToSaveToken();

    setInterval(() => {
      this.retriveOperationsState();
    }, 500);

    this.addIconLink();

    this.addSnackbar();

    panel.toolbar.addItem('monitorButton', monitorButton);

    return monitorButton;
  }

  addIconLink(): void {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/icon?family=Material+Icons+Outlined';
    document.head.appendChild(link);
  }

  addSnackbar(): void {
    const snackbar = document.createElement('div');
    snackbar.id = 'monitor-snackbar';
    snackbar.innerHTML = this.snackbarHTML;
    document.body.appendChild(snackbar);
  }

  showSnackbar(): void {
    const snackbar = document.getElementById('monitor-snackbar');
    snackbar.className = 'show';
    setTimeout(() => {
      snackbar.className = snackbar.className.replace('show', '');
    }, 3000);
  }

  handle(msg: ICommMsgMsg): void {
    console.log(msg);
  }

  async retriveOperationsState(): Promise<void> {
    if (this.monitorHTLM && !this.calculationsFinished) {
      const settings = ServerConnection.makeSettings({});
      const serverResponse = await ServerConnection.makeRequest(
        URLExt.join(settings.baseUrl, '/AWSMonitor'),
        { method: 'GET' },
        settings
      );
      const response = await serverResponse.json();
      if (response['npart'] !== 0) {
        this.setPartitions(response['npart']);
        if (!this.invokationFinished) {
          this.setCreated(response['INV']);
          if (response['npart'] === response['INV']) {
            this.invokationFinished = true;
          }
        }
        this.setFinished(response['FIN']);
        if (response['FIN'] === this.partitions) {
          this.calculationsFinished = true;
        }
      }
      console.log(response);
    }
  }

  async sendPostRequestToSaveToken(): Promise<void> {
    const settings = ServerConnection.makeSettings({});
    ServerConnection.makeRequest(
      URLExt.join(settings.baseUrl, '/AWSMonitor'),
      { method: 'POST'},
      settings
    );
  }

  addMonitor(panel: NotebookPanel): void {
    this.searchForCellWithAnnotation(panel);
  }

  searchForCellWithAnnotation(panel: NotebookPanel): void {
    const cellsFromDomModel = document.getElementsByClassName(
      'lm-Widget p-Widget lm-Panel p-Panel jp-Cell-inputWrapper'
    );
    this.removeMonitor();
    this.insertAWSMonitor(
      cellsFromDomModel.item(panel.content.activeCellIndex)
    );
  }

  removeMonitor(): void {
    if (this.monitorHTLM) {
      const element = document.getElementById('monitor');
      element.parentNode.removeChild(element);
      this.calculationsFinished = false;
      this.invokationFinished = false;
      this.startTime = null;
      this.partitions = null;
    }
  }

  insertAWSMonitor(selectedCellHTML: Element): void {
    this.monitorHTLM = document.createElement('div');
    this.monitorHTLM.id = 'monitor';
    this.monitorHTLM.innerHTML = this.monitorInnerHTML;

    selectedCellHTML.parentNode.insertBefore(
      this.monitorHTLM,
      selectedCellHTML.nextElementSibling
    );
  }

  setPartitions(partitions: number): void {
    if (!this.partitions && partitions !== 0) {
      this.partitions = partitions;
      this.startTime = Date.now();
      document.getElementById('partitions-text').textContent =
        'Partitions: ' + this.partitions;
    }
  }

  setCreated(created: number): void {
    if (created === this.partitions) {
      this.setTimeText(Date.now(), 'created-time');
    }
    document.getElementById('created-bar').style.width =
      ((250 * created) / this.partitions).toString() + 'px';
    document.getElementById('created-number').textContent =
      created + '/' + this.partitions;
  }

  setFinished(finished: number): void {
    if (finished === this.partitions) {
      this.setTimeText(Date.now(), 'finished-time');
    }
    document.getElementById('finished-bar').style.width =
      ((250 * finished) / this.partitions).toString() + 'px';
    document.getElementById('finished-number').textContent =
      finished + '/' + this.partitions;
  }

  setTimeText(time: number, id: string): void {
    const timeToDisplay = (time - this.startTime) / 1000;
    document.getElementById(id).textContent = timeToDisplay.toFixed(2) + ' s';
  }
}

/**
 * Initialization data for the AWSMonitor extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'AWSMonitor:plugin',
  autoStart: true,
  optional: [ISettingRegistry],
  activate: (app: JupyterFrontEnd, notebooks: INotebookTracker) => {
    console.log('JupyterLab extension AWSMonitor is activated!');
    const monitorExtension = new AWSMonitorExtension();
    app.docRegistry.addWidgetExtension('Notebook', monitorExtension);
  }
};

export default plugin;
