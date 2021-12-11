import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { ToolbarButton } from '@jupyterlab/apputils';

import { DocumentRegistry } from '@jupyterlab/docregistry';

import { ICodeCellModel, IMarkdownCellModel } from '@jupyterlab/cells';

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

  monitorCell: IMarkdownCellModel;

  selectedCellHTML: Element;

  lastOutput: string;

  monitorHTLM: HTMLDivElement;

  partitions: number;

  created: number;

  finished: number;

  startTime: number;

  currentIndex: number;

  kernel: IKernelConnection;

  calculationsFinished = true;

  invokationFinished = false;

  monitorButtonClicked = false;

  monitorInnerHTML = `
  <div class="monitor-outer-wrapper">
    <div id="monitor-wrapper">
      <div id="monitor-header">
        <p id="monitor-title-text">AWSMonitor</p>
        <p id="partitions-text" class="monitor-title" style="margin-top: 13px">Partitions: </p>
      </div>
      <div id="monitor-column-titles-wrapper" class="monitor-content-wrapper">
		<div id="status-text">
			<p class="monitor-title" style="margin-top: 13px">Status</p>
		</div>
        <p class="monitor-title" style="margin-top: 13px">Progress</p>
        <p class="monitor-title" style="margin-top: 13px">Duration</p>
      </div>
      <div class="monitor-info-row-wrapper monitor-content-wrapper">
        <p class="monitor-title" style="margin-top: 13px">Created</p>
        <div class="monitor-info-row">
          <div class="monitor-progress-text">
            <p id="created-number"></p>
          </div>
          <div id="created-bar" class="progress-bar created-bar-color">
          </div>
        </div>
        <div class="time-container">
          <p id="created-time" class="monitor-title" style="margin-top: 13px"></p>
        </div>
      </div>
      <div id="monitor-bars-divider">
      </div>
      <div class="monitor-info-row-wrapper monitor-content-wrapper">
        <p class="monitor-title" style="margin-top: 13px">Finished</p>
        <div class="monitor-info-row">
          <div class="monitor-progress-text">
            <p id="finished-number"></p>
          </div>
          <div id="finished-bar" class="progress-bar finished-bar-color">
          </div>
        </div>
		<div class="time-container">
			<p id="finished-time" class="monitor-title" style="margin-top: 13px"></p>	
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
    Select cell under which you want monitor to be displayed
  </p>
  `;

  createNew(
    panel: NotebookPanel,
    context: DocumentRegistry.IContext<INotebookModel>
  ): IDisposable {
    this.dialogOpened = false;
    this.partitions = 0;
    this.created = 0;
    this.finished = 0; 
    const monitorButton = new ToolbarButton({
      label: 'AWS Monitor',
      onClick: () => {
        if (!this.monitorButtonClicked) {
          this.showSnackbar();
          this.monitorButtonClicked = true;
        } else {
          if (this.calculationsFinished) {
            this.showMonitor(panel);
            this.calculationsFinished = false;
          }
        } 
      }
    });

    this.sendPostRequestToSaveToken();

    setInterval(() => {
      this.retriveOperationsState();
    }, 500);

    this.addIconLink();

    this.addSnackbar();

    this.addCSS();

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

  addCSS() : void {

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
    if (this.monitorCell && !this.calculationsFinished) {
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
          this.resetStatus();
        }
      }
      console.log(response);
    }
  }

  resetStatus(): void {
    this.invokationFinished = false;
    this.calculationsFinished = true;
    this.partitions = null;
    this.monitorCell.value.text = document.getElementById('monitor' + this.currentIndex).outerHTML;
  }
  async sendPostRequestToSaveToken(): Promise<void> {
    const settings = ServerConnection.makeSettings({});
    ServerConnection.makeRequest(
      URLExt.join(settings.baseUrl, '/AWSMonitor'),
      { method: 'POST'},
      settings
    );
  }

  showMonitor(panel: NotebookPanel): void {
    // const cellsFromDomModel = document.getElementsByClassName(
    //   'lm-Widget p-Widget lm-Panel p-Panel jp-Cell-inputWrapper'
    // );
    this.monitorCell = panel.content.model.contentFactory.createMarkdownCell({});
    this.currentIndex = 0;
    for (let i = 0; i < 50; i++) {
      const monitorHTML = document.getElementById('monitor' + i);
      if (monitorHTML === null) {
        this.currentIndex = i;
        break;
      }
    }
    this.monitorCell.value.text = this.monitorInnerHTML;
    this.monitorCell.value.text = this.monitorCell.value.text.replace(
      '"partitions-text"',
      '"partitions-text' + this.currentIndex + '"'
    );
    this.monitorCell.value.text = this.monitorCell.value.text.replace(
      '"created-bar"',
      '"created-bar' + this.currentIndex + '"'
    );
    this.monitorCell.value.text = this.monitorCell.value.text.replace(
      '"created-number"',
      '"created-number' + this.currentIndex + '"'
    );
    this.monitorCell.value.text = this.monitorCell.value.text.replace(
      '"created-time"',
      '"created-time' + this.currentIndex + '"'
    );
    this.monitorCell.value.text = this.monitorCell.value.text.replace(
      '"finished-bar"',
      '"finished-bar' + this.currentIndex + '"'
    );
    this.monitorCell.value.text = this.monitorCell.value.text.replace(
      '"finished-number"',
      '"finished-number' + this.currentIndex + '"'
    );
    this.monitorCell.value.text = this.monitorCell.value.text.replace(
      '"finished-time"',
      '"finished-time' + this.currentIndex + '"'
    );
    this.monitorCell.value.text = this.monitorCell.value.text.replace(
      'div class="monitor-outer-wrapper"',
      'div id="monitor' + this.currentIndex + '" class="monitor-outer-wrapper"'
    );
    panel.content.model.cells.insert(
      panel.content.activeCellIndex + 1,
      this.monitorCell
    );
    // this.insertAWSMonitor(
    //   cellsFromDomModel.item(panel.content.activeCellIndex)
    // );
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
      document.getElementById('partitions-text' + this.currentIndex).textContent =
        'Partitions: ' + this.partitions;
    }
  }

  setCreated(created: number): void {
    if (created === this.partitions) {
      this.setTimeText(Date.now(), 'created-time' + this.currentIndex);
    }
    document.getElementById('created-bar' + this.currentIndex).style.width =
      ((250 * created) / this.partitions).toString() + 'px';
    document.getElementById('created-number' + this.currentIndex).textContent =
      created + '/' + this.partitions;
  }

  setFinished(finished: number): void {
    if (finished === this.partitions) {
      this.setTimeText(Date.now(), 'finished-time' + this.currentIndex);
    }
    document.getElementById('finished-bar' + this.currentIndex).style.width =
      ((250 * finished) / this.partitions).toString() + 'px';
    document.getElementById('finished-number' + this.currentIndex).textContent =
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