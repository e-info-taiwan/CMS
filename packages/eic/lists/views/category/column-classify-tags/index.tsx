import { createFilteredRelationship } from '../../shared/createFilteredRelationship'

const { Field, Cell, CardValue, controller } = createFilteredRelationship({
  sourceField: 'classifies',
  filterByField: 'classifies',
  filterStyle: 'idIn',
  emptyMessage: '請先在「包含的小分類」選擇至少一個項目',
})

export { Field, Cell, CardValue, controller }
