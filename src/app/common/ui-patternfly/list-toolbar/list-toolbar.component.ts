import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnDestroy,
  OnInit,
  TemplateRef,
} from '@angular/core';

import { Subject } from 'rxjs/Subject';
import { Observable } from 'rxjs/Observable';
import { Subscription } from 'rxjs/Subscription';

import {
  ActionConfig,
  FilterConfig,
  FilterEvent,
  SortConfig,
  SortField,
  SortEvent,
  ToolbarConfig,
} from 'patternfly-ng';

import { ObjectPropertyFilterPipe } from '../../object-property-filter.pipe';
import { ObjectPropertySortPipe } from '../../object-property-sort.pipe';

@Component({
  selector: 'syndesis-list-toolbar',
  templateUrl: './list-toolbar.component.html',
  styleUrls: ['./list-toolbar.component.scss'],
})
export class ListToolbarComponent<T> implements OnInit, OnDestroy {

  @Input() items: Observable<Array<T>> = Observable.empty();
  @Input() filteredItems: Subject<Array<T>>;
  @Input() actionTemplate: TemplateRef<any>;
  toolbarConfig: ToolbarConfig;
  private _allItems: Array<T> = [];
  private _filteredItems: Array<T> = [];
  private subscription: Subscription;
  private currentSortFieldId: string;
  private isAscendingSort = true;
  private propertyFilter = new ObjectPropertyFilterPipe();
  private propertySorter = new ObjectPropertySortPipe();

  ngOnInit() {
    const filterConfig = {
      fields : [{
        id          : 'name',
        title       : 'Name',
        placeholder : 'Filter by Name...',
        type        : 'text',
      }],
      appliedFilters : [],
    };
    const sortConfig = {
      fields : [{
        id       : 'name',
        title    : 'Name',
        sortType : 'alpha',
      }],
      isAscending : this.isAscendingSort,
    } as SortConfig;

    this.toolbarConfig = {
      filterConfig : filterConfig,
      sortConfig   : sortConfig,
    } as ToolbarConfig;

    this.subscription = this.items
      .do(items => this._allItems = items)
      .do(items => {
        if (items.find(item => item['tags'])) {
          if (!filterConfig.fields.find(field => field.id === 'tag')) {
            filterConfig.fields.push({
              id          : 'tag',
              title       : 'Tag',
              placeholder : 'Filter by tag...',
              type        : 'typeahead',
            });
          }
        } else {
          const index = filterConfig.fields.findIndex(field => field.id === 'tag');
          if (index >= 0) {
            filterConfig.fields.splice(index, 1);
          }
        }
      })
      .do(_ => this.filter())
      .subscribe();
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  filter(): void {
    const result = this.toolbarConfig.filterConfig.appliedFilters
      .reduce((items, filter) => filter.field.id === 'tag'
        ? items.filter(item => Array.isArray(item['tags'])
          ? item['tags'].some(tag => tag === filter.query.value)
          : false)
        : this.propertyFilter.transform(items, {
            filter       : filter.value,
            propertyName : filter.field.id,
          }), this._allItems);
    this.toolbarConfig.filterConfig.resultsCount = result.length;
    this._filteredItems = result;
    this.sort();
  }

  sort($event?: SortEvent): void {
    if ($event) {
      this.currentSortFieldId = $event.field.id;
      this.isAscendingSort = $event.isAscending;
    }
    const result = this.propertySorter.transform(this._filteredItems, {
      sortField  : this.currentSortFieldId || 'name',
      descending : !this.isAscendingSort,
    });
    this.filteredItems.next(result);
  }

  filterFieldSelected($event: FilterEvent) {
    const field = $event.field;
    if (field.id === 'tag') {
      field.queries = this._allItems
        .map(item => item['tags'] || [])
        .reduce((array, tags) => array.concat(tags), [])
        .filter((tag, i, tags) => tags.indexOf(tag) === i)
        .map(tag => ({ id: tag, value: tag }));
    }
  }
}
