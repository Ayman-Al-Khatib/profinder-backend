class ApiFeatures {
  constructor(model, filterQuery, defineOperations) {
    this.filterQuery = filterQuery;
    this.defineOperations = defineOperations;
    this.model = model;
  }

  filter(developerProjection) {
    if (developerProjection) this.model = this.model.find(this.filterQuery, developerProjection);
    else this.model = this.model.find(this.filterQuery);
    return this;
  }

  sort(developerSort) {
    if (this.defineOperations.sort) {
      // Split the sort query parameters and join them with space
      let sortBy = this.defineOperations.sort.split(',');
      for (let i = 0; i < sortBy.length; i++) sortBy[i] = sortBy[i].trim();
      sortBy = sortBy.join(' ');
      // Apply sorting to the model
      if (developerSort) this.model.sort(developerSort);
      this.model = this.model.sort(sortBy).collation({ locale: 'en', strength: 2 });
    }
    return this;
  }

  limitFields() {
    if (this.defineOperations.fields) {
      // Split the fields query parameters and join them with space
      const fields = this.defineOperations.fields.split(',').join(' ');
      // Select specific fields or exclude certain fields
      this.model = this.model.select(fields);
    } else {
      // Exclude '__v' field by default
      this.model = this.model.select('-__v');
    }
    return this;
  }

  search({ conditions }) {
    if (this.defineOperations.search) {
      if (conditions) {
        // Construct OR conditions for search across multiple fields
        // const orConditions = fields.map(field => ({
        //   [field]: { $regex: this.defineOperations.search, $options: 'i' },
        // }));
        // Apply search query to the model
        this.model = this.model.find(conditions);
      }
    }
    return this;
  }

  populate(populateDeveloper) {
    if (populateDeveloper) this.model = this.model.find().populate(populateDeveloper);
    return this;
  }

  paginate(countDocuments) {
    let page = Math.max(1, parseInt(this.defineOperations.page) || 1);
    let limit = Math.max(1, parseInt(this.defineOperations.limit) || 10);

    const skip = (page - 1) * limit;
    const endIndex = page * limit;

    // Pagination result object
    const pagination = {};
    pagination.current_page = page;
    pagination.limit = limit;
    pagination.number_of_pages = Math.ceil(countDocuments / limit);

    // Calculate next and previous pages
    if (endIndex < countDocuments) {
      pagination.next = page + 1;
    }
    if (skip > 0) {
      pagination.prev = page - 1;
    }

    // Apply pagination to the model
    this.model = this.model.skip(skip).limit(limit);

    // Store pagination result
    this.paginationResult = pagination;
    return this;
  }
}

module.exports = ApiFeatures;
