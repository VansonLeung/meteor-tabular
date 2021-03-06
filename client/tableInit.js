/* global tableInit:true, _, Blaze, Util */

/**
 * Uses the Tabular.Table instance to get the columns, fields, and searchFields
 * @param {Tabular.Table} tabularTable The Tabular.Table instance
 * @param {Template}      template     The Template instance
 */
tableInit = function tableInit(tabularTable, template) {
  var columns = _.clone(tabularTable.options.columns);
  var fields = {}, searchFields = [];

  // Loop through the provided columns object
  _.each(columns, function (col) {
    // The `tmpl` column option is special for this
    // package. We parse it into other column options
    // and then remove it.
    var tmpl = col.tmpl;
    if (tmpl) {
      // Cell should be initially blank
      col.defaultContent = "";

      // If there's also data attached, then we can still
      // sort on this column. If not, then we shouldn't try.
      if (!("data" in col)) {
        col.orderable = false;
      }

      // When the cell is created, render it's content from
      // the provided template with row data.
      col.createdCell = function (cell, cellData, rowData) {
        // Allow the table to adjust the template context if desired
        if (typeof col.tmplContext === 'function') {
          rowData = col.tmplContext(rowData);
        }

        Blaze.renderWithData(tmpl, rowData, cell);
      };

      // Then delete the `tmpl` property since DataTables
      // doesn't need it.
      delete col.tmpl;
    }

    // Automatically protect against errors from null and undefined
    // values
    if (!("defaultContent" in col)) {
      col.defaultContent = "";
    }

    // Find the correct collection to search/sort, for backwards compatibility
    // Check if a class is set, otherwise revert to default data() attribute
    // The class value circumvent issues with a data attribute  set as an
    // instance function (i.e. a collection helper: "()" )
    if (col.query === undefined) {
      if (col.class === undefined) {
        col.query = col.data;
      } else {
        col.query = col.class;
      }
    }
    var dataProp = col.query;

    if (typeof dataProp === "string") {
      // If after manipulating the dataProp value, the data property
      // is still referencing an instance function, don't
      // include it. Prevent sorting and searching because
      // our pub function won't be able to do it.
      if (dataProp.indexOf("()") !== -1) {
        col.orderable = false;
        col.searchable = false;
      }

      // To prevent searching and sorting, simply set the property,
      // 'searchable: false' (or sortable) next to the definition
      // of the 'data: "..." ' field

      fields[Util.cleanFieldName(dataProp)] = 1;

      // DataTables says default value for col.searchable is `true`,
      // so we will search on all columns that haven't been set to
      // `false`.
      if (col.searchable !== false) {
        searchFields.push(Util.cleanFieldNameForSearch(dataProp));
      }
    }

    // If we're displaying a template for this field,
    // and we've also provided data, we want to
    // pass the data prop along to DataTables
    // to enable sorting and filtering.
    // However, DataTables will then add that data to
    // the displayed cell, which we don't want since
    // we're rendering a template there with Blaze.
    // We can prevent this issue by having the "render"
    // function return an empty string for display content.
    if (tmpl && "data" in col && !("render" in col)) {
      col.render = function (data, type) {
        if (type === 'display') {
          return '';
        }
        return data;
      };
    }

    if (typeof col.titleFn === 'function') {
      col.title = col.titleFn();
      col.sTitle = col.titleFn();
    }
  });

  template.tabular.columns = columns;
  template.tabular.fields = fields;
  template.tabular.searchFields = searchFields;

  tableRefreshColTitle(tabularTable, template);
};


tableRefreshColTitle = function tableRefreshColTitle(tabularTable, template) {
  var columns = _.clone(tabularTable.options.columns);

  _.each(columns, function (col) {

    if (typeof col.titleFn === 'function') {
      col.title = col.titleFn();
      col.sTitle = col.titleFn();
    }
  });

  $tableElement = template.$('table');
  var th = $tableElement.find("thead tr th");
  $.each(th, function(index, t) {
    $(t).html(columns[index].title);
  })

  template.tabular.columns = columns;
};

