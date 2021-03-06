(function(define) {

"use strict";

// Bookshelf.Sync
// -------------------
define(function(require, exports) {

  var _    = require('underscore');
  var when = require('when');

  // Sync is the dispatcher for any database queries,
  // taking the "syncing" `model` or `collection` being queried, along with
  // a hash of options that are used in the various query methods.
  // If the `transacting` option is set, the query is assumed to be
  // part of a transaction, and this information is passed along to `Knex`.
  var Sync = function(syncing, options) {
    options || (options = {});
    this.query = syncing.query();
    this.syncing = syncing.resetQuery();
    this.options = options;
    if (options.transacting) this.query.transacting(options.transacting);
  };

  _.extend(Sync.prototype, {

    // Select the first item from the database - only used by models.
    first: function() {
      var syncing = this.syncing;
      this.query.where(syncing.format(_.extend(Object.create(null), syncing.attributes))).limit(1);
      return this.select();
    },

    // Runs a `select` query on the database, adding any necessary relational
    // constraints, resetting the query when complete. If there are results and
    // eager loaded relations, those are fetched and returned on the model before
    // the promise is resolved. Any `success` handler passed in the
    // options will be called - used by both models & collections.
    select: function() {
      var columns, sync = this, syncing = this.syncing,
        options = this.options, relatedData = syncing.relatedData;

      // Inject all appropriate select costraints dealing with the relation
      // into the `knex` query builder for the current instance.
      if (relatedData) {
        relatedData.selectConstraints(this.query, options);
      } else {
        columns = options.columns;
        if (!_.isArray(columns)) columns = columns ? [columns] : ['*'];
      }

      // Create the deferred object, triggering a `fetching` event if the model
      // isn't an eager load.
      return when(function(){
        if (!options.isEager) return syncing.triggerThen('fetching', syncing, columns, options);
      }()).then(function() {
        return sync.query.select(columns);
      });
    },

    // Issues an `insert` command on the query - only used by models.
    insert: function() {
      var syncing = this.syncing;
      return this.query
        .insert(syncing.format(_.extend(Object.create(null), syncing.attributes)), syncing.idAttribute);
    },

    // Issues an `update` command on the query - only used by models.
    update: function(attrs) {
      var syncing = this.syncing, query = this.query;
      if (syncing.id != null) query.where(syncing.idAttribute, syncing.id);
      if (query.wheres.length === 0) {
        return when.reject(new Error('A model cannot be updated without a "where" clause or an idAttribute.'));
      }
      return query.update(syncing.format(_.extend(Object.create(null), attrs)));
    },

    // Issues a `delete` command on the query.
    del: function() {
      var query = this.query, syncing = this.syncing;
      if (syncing.id != null) query.where(syncing.idAttribute, syncing.id);
      if (query.wheres.length === 0) {
        return when.reject(new Error('A model cannot be destroyed without a "where" clause or an idAttribute.'));
      }
      return this.query.del();
    }
  });

  exports.Sync = Sync;

});

})(
  typeof define === 'function' && define.amd ? define : function (factory) { factory(require, exports); }
);