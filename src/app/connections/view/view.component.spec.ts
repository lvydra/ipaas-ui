/* tslint:disable:no-unused-variable */
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { DebugElement } from '@angular/core';
import { MockBackend } from '@angular/http/testing';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { DynamicFormsCoreModule } from '@ng2-dynamic-forms/core';
import { RouterTestingModule } from '@angular/router/testing';

import { ModalModule } from 'ngx-bootstrap/modal';
import { TagInputModule } from 'ngx-chips';

import { RequestOptions, BaseRequestOptions, Http } from '@angular/http';

import { ToolbarModule } from 'patternfly-ng';

import { ConnectionViewComponent } from './view.component';
import { ConnectionsListComponent } from '../list/list.component';
import { StoreModule } from '../../store/store.module';
import { SyndesisCommonModule } from '../../common/common.module';
import { PatternflyUIModule } from '../../common/ui-patternfly/ui-patternfly.module';

describe('ConnectionViewComponent', () => {
  let component: ConnectionViewComponent;
  let fixture: ComponentFixture<ConnectionViewComponent>;

  beforeEach(
    async(() => {
      TestBed.configureTestingModule({
        imports: [
          CommonModule,
          FormsModule,
          ReactiveFormsModule,
          DynamicFormsCoreModule.forRoot(),
          PatternflyUIModule,
          SyndesisCommonModule,
          StoreModule,
          RouterTestingModule.withRoutes([]),
          ModalModule,
          BrowserAnimationsModule,
          TagInputModule,
          ToolbarModule,
        ],
        declarations: [
          ConnectionViewComponent,
          ConnectionsListComponent,
        ],
        providers: [
          MockBackend,
          { provide: RequestOptions, useClass: BaseRequestOptions },
          {
            provide: Http,
            useFactory: (backend, options) => {
              return new Http(backend, options);
            },
            deps: [MockBackend, RequestOptions],
          },
        ],
      }).compileComponents();
    }),
  );

  beforeEach(() => {
    fixture = TestBed.createComponent(ConnectionViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
