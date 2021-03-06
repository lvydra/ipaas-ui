import { Injectable, EventEmitter } from '@angular/core';
import { Subscription } from 'rxjs/Subscription';
import { Observable } from 'rxjs/Observable';

import { ConnectionStore } from '../../store/connection/connection.store';
import { ConnectorStore } from '../../store/connector/connector.store';
import { Connection, Connector, Connections, Connectors } from '../../model';

import { log, getCategory } from '../../logging';

const category = getCategory('CurrentConnectionService');

export class ConnectionEvent {
  kind: string;
  [name: string]: any;
}

@Injectable()
export class CurrentConnectionService {
  private _connection: Connection;
  private _credentials: any;
  private subscription: Subscription;

  events = new EventEmitter<ConnectionEvent>();

  constructor(
    private store: ConnectionStore,
    private connectorStore: ConnectorStore,
  ) {
    this.subscription = this.events.subscribe((event: ConnectionEvent) =>
      this.handleEvent(event),
    );
  }


  private checkCredentials() {
    const connectorId = this._connection.connectorId;
    if (!connectorId) {
      return false;
    }
    if (!this._credentials || this._credentials.connectorId !== connectorId) {
      // fetch any credentials for the connector
      const sub = this.fetchCredentials().subscribe(
        () => {
          sub.unsubscribe();
          this.events.emit({
            kind: 'connection-set-connection',
            connection: this._connection,
          });
        },
        error => {
          log.infoc(
            () =>
              'Failed to fetch connector credentials: ' + JSON.stringify(error),
            category,
          );
          sub.unsubscribe();
          this.events.emit({
            kind: 'connection-set-connection',
            connection: this._connection,
          });
        },
      );
      return true;
    } else {
      return false;
    }

  }

  private fetchConnector(connectorId: string) {
    if (connectorId && !this._connection.connector) {
      const sub = this.connectorStore.load(connectorId).subscribe(
        connector => {
          if (!connector.id) {
            return;
          }
          this._connection.connector = connector;
          this._connection.icon = connector.icon;
          this.events.emit({
            kind: 'connection-check-credentials',
            connection: this._connection,
          });
          sub.unsubscribe();
        },
        error => {
          try {
            log.infoc(
              () =>
                'Failed to fetch connector: ' +
                JSON.stringify(error),
              category,
            );
          } catch (err) {
            log.infoc(
              () => 'Failed to fetch connector: ' + error,
              category,
            );
          }
          this.events.emit({
            kind: 'connection-check-credentials',
            error: error,
            connection: this._connection,
          });
          sub.unsubscribe();
        },
      );
      return true;
    }
    return false;
  }

  handleEvent(event: ConnectionEvent) {
    log.infoc(() => 'connection event: ' + JSON.stringify(event), category);
    switch (event.kind) {
      case 'connection-check-connector':
        if (!this.fetchConnector(this._connection.connectorId)) {
          this.events.emit({
            kind: 'connection-check-credentials',
            connectorId: this._connection.connectorId,
          });
        }
        break;
      case 'connection-check-credentials':
        if (!this.checkCredentials()) {
          this.events.emit({
            kind: 'connection-set-connection',
            connection: this._connection,
          });
        }
        break;
      case 'connection-set-connection':
        break;
      // TODO not sure if these next 3 cases are needed really
      case 'connection-set-name':
        this._connection.name = event['name'];
        break;
      case 'connection-set-description':
        this._connection.description = event['description'];
        break;
      case 'connection-set-tags':
        this._connection.tags = event['tags'];
        break;
      case 'connection-save-connection':
        this.saveConnection(event);
        break;
      default:
    }
  }

  private fetchCredentials() {
    if (!this._connection || !this._connection.connectorId) {
      this._credentials = undefined;
      return Observable.empty();
    }
    const connectorId = this._connection.connectorId;
    return Observable.create(observer => {
      this.connectorStore.credentials(connectorId).subscribe((resp: any) => {
        // enrich the response with the connectorId
        this._credentials = { ...resp, ...{ connectorId: connectorId } };
        observer.next(this._credentials);
        observer.complete();
      });
    });
  }

  public acquireCredentials() {
    if (!this._connection || !this._connection.connectorId) {
      this._credentials = undefined;
      return Observable.empty();
    }
    const connectorId = this._connection.connectorId;
    this.connectorStore
      .acquireCredentials(connectorId)
      .subscribe((resp: any) => {
        log.infoc(() => 'Got response: ' + JSON.stringify(resp));
      });
  }

  private saveConnection(event: ConnectionEvent) {
    // poor man's clone
    const connection = <Connection>JSON.parse(
      JSON.stringify(event['connection'] || this.connection),
    );
    // just in case this leaks through from the form
    for (const prop in connection.connector.properties) {
      if (!prop.hasOwnProperty(prop)) {
        continue;
      }
      delete connection.connector.properties[prop]['value'];
    }
    const sub = this.store.updateOrCreate(connection).subscribe(
      (c: Connection) => {
        log.debugc(
          () => 'Saved connection: ' + JSON.stringify(c, undefined, 2),
          category,
        );
        const action = event['action'];
        if (action && typeof action === 'function') {
          action(c);
        }
        sub.unsubscribe();
      },
      (reason: any) => {
        log.debugc(
          () =>
            'Error saving connection: ' + JSON.stringify(reason, undefined, 2),
          category,
        );
        const errorAction = event['error'];
        if (errorAction && typeof errorAction === 'function') {
          errorAction(reason);
        }
        sub.unsubscribe();
      },
    );
  }

  get credentials(): any {
    return this._credentials;
  }

  hasCredentials(): boolean {
    return this._credentials && this._credentials.type !== undefined;
  }

  get connection(): Connection {
    return this._connection;
  }

  set connection(connection: Connection) {
    this._connection = connection;
    const connectorId = connection.connectorId;
    this.events.emit({
      kind: 'connection-check-connector',
      connection: this._connection,
    });
  }
}
