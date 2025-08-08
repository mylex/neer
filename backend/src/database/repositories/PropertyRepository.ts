import { PoolClient } from 'pg';
import { db } from '../../config/database';
import {
  Property,
  CreatePropertyInput,
  UpdatePropertyInput,
  PropertyFilters,
  PaginationParams,
  PaginatedResponse,
  PropertyStats,
  TranslationStatus,
  PropertyType
} from '../../models/Property';

export class PropertyRepository {
  // Create a new property
  async create(propertyData: CreatePropertyInput): Promise<Property> {
    const query = `
      INSERT INTO properties (
        url, title, title_en, price, location, location_en, size_sqm,
        property_type, description, description_en, images, listing_date,
        source_website, translation_status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
      )
      RETURNING *
    `;

    const values = [
      propertyData.url,
      propertyData.title,
      propertyData.titleEn || null,
      propertyData.price || null,
      propertyData.location,
      propertyData.locationEn || null,
      propertyData.sizeSqm || null,
      propertyData.propertyType || null,
      propertyData.description || null,
      propertyData.descriptionEn || null,
      JSON.stringify(propertyData.images || []),
      propertyData.listingDate || null,
      propertyData.sourceWebsite,
      propertyData.translationStatus || TranslationStatus.PENDING
    ];

    try {
      const result = await db.query(query, values);
      return this.mapRowToProperty(result.rows[0]);
    } catch (error) {
      console.error('Error creating property:', error);
      throw error;
    }
  }

  // Find property by ID
  async findById(id: number): Promise<Property | null> {
    const query = 'SELECT * FROM properties WHERE id = $1';
    
    try {
      const result = await db.query(query, [id]);
      return result.rows.length > 0 ? this.mapRowToProperty(result.rows[0]) : null;
    } catch (error) {
      console.error('Error finding property by ID:', error);
      throw error;
    }
  }

  // Find property by URL
  async findByUrl(url: string): Promise<Property | null> {
    const query = 'SELECT * FROM properties WHERE url = $1';
    
    try {
      const result = await db.query(query, [url]);
      return result.rows.length > 0 ? this.mapRowToProperty(result.rows[0]) : null;
    } catch (error) {
      console.error('Error finding property by URL:', error);
      throw error;
    }
  }

  // Update property
  async update(propertyData: UpdatePropertyInput): Promise<Property | null> {
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Build dynamic update query
    Object.entries(propertyData).forEach(([key, value]) => {
      if (key !== 'id' && value !== undefined) {
        const dbField = this.camelToSnakeCase(key);
        updateFields.push(`${dbField} = $${paramIndex}`);
        values.push(key === 'images' ? JSON.stringify(value) : value);
        paramIndex++;
      }
    });

    if (updateFields.length === 0) {
      throw new Error('No fields to update');
    }

    // Add updated_at field
    updateFields.push(`updated_at = NOW()`);
    values.push(propertyData.id);

    const query = `
      UPDATE properties 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    try {
      const result = await db.query(query, values);
      return result.rows.length > 0 ? this.mapRowToProperty(result.rows[0]) : null;
    } catch (error) {
      console.error('Error updating property:', error);
      throw error;
    }
  }

  // Delete property
  async delete(id: number): Promise<boolean> {
    const query = 'DELETE FROM properties WHERE id = $1';
    
    try {
      const result = await db.query(query, [id]);
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting property:', error);
      throw error;
    }
  }

  // Find properties with filters and pagination
  async findMany(
    filters: PropertyFilters = {},
    pagination: PaginationParams = { page: 1, limit: 20 }
  ): Promise<PaginatedResponse<Property>> {
    const { whereClause, values, paramIndex } = this.buildWhereClause(filters);
    const { sortBy, sortOrder } = pagination;
    
    // Build ORDER BY clause
    const orderBy = this.buildOrderByClause(sortBy, sortOrder);
    
    // Calculate offset
    const offset = (pagination.page - 1) * pagination.limit;
    
    // Count query
    const countQuery = `SELECT COUNT(*) as total FROM properties ${whereClause}`;
    
    // Data query
    const dataQuery = `
      SELECT * FROM properties 
      ${whereClause}
      ${orderBy}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    try {
      // Execute both queries
      const [countResult, dataResult] = await Promise.all([
        db.query(countQuery, values),
        db.query(dataQuery, [...values, pagination.limit, offset])
      ]);

      const total = parseInt(countResult.rows[0].total, 10);
      const totalPages = Math.ceil(total / pagination.limit);

      return {
        data: dataResult.rows.map((row: any) => this.mapRowToProperty(row)),
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total,
          totalPages,
          hasNext: pagination.page < totalPages,
          hasPrev: pagination.page > 1
        }
      };
    } catch (error) {
      console.error('Error finding properties:', error);
      throw error;
    }
  }

  // Search properties with full-text search
  async search(
    searchQuery: string,
    filters: PropertyFilters = {},
    pagination: PaginationParams = { page: 1, limit: 20 }
  ): Promise<PaginatedResponse<Property>> {
    const { whereClause, values, paramIndex } = this.buildWhereClause(filters);
    
    // Add full-text search condition
    const searchCondition = `
      ${whereClause ? 'AND' : 'WHERE'} 
      to_tsvector('english', COALESCE(title_en, '') || ' ' || COALESCE(description_en, '') || ' ' || COALESCE(location_en, '')) 
      @@ plainto_tsquery('english', $${paramIndex})
    `;
    
    values.push(searchQuery);
    const newParamIndex = paramIndex + 1;
    
    const { sortBy, sortOrder } = pagination;
    const orderBy = this.buildOrderByClause(sortBy, sortOrder);
    const offset = (pagination.page - 1) * pagination.limit;
    
    // Count query
    const countQuery = `SELECT COUNT(*) as total FROM properties ${whereClause} ${searchCondition}`;
    
    // Data query with search ranking
    const dataQuery = `
      SELECT *, 
        ts_rank(to_tsvector('english', COALESCE(title_en, '') || ' ' || COALESCE(description_en, '') || ' ' || COALESCE(location_en, '')), 
                plainto_tsquery('english', $${paramIndex})) as search_rank
      FROM properties 
      ${whereClause} ${searchCondition}
      ORDER BY search_rank DESC, ${orderBy.replace('ORDER BY ', '')}
      LIMIT $${newParamIndex} OFFSET $${newParamIndex + 1}
    `;

    try {
      const [countResult, dataResult] = await Promise.all([
        db.query(countQuery, values),
        db.query(dataQuery, [...values, pagination.limit, offset])
      ]);

      const total = parseInt(countResult.rows[0].total, 10);
      const totalPages = Math.ceil(total / pagination.limit);

      return {
        data: dataResult.rows.map((row: any) => this.mapRowToProperty(row)),
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total,
          totalPages,
          hasNext: pagination.page < totalPages,
          hasPrev: pagination.page > 1
        }
      };
    } catch (error) {
      console.error('Error searching properties:', error);
      throw error;
    }
  }

  // Get property statistics
  async getStats(): Promise<PropertyStats> {
    const query = 'SELECT * FROM property_stats';
    
    try {
      const result = await db.query(query);
      const stats = result.rows[0];
      
      // Get properties by type count
      const typeCountQuery = `
        SELECT property_type, COUNT(*) as count
        FROM properties
        GROUP BY property_type
      `;
      const typeCountResult = await db.query(typeCountQuery);
      
      const propertiesByType: Record<PropertyType, number> = {
        [PropertyType.APARTMENT]: 0,
        [PropertyType.HOUSE]: 0,
        [PropertyType.MANSION]: 0,
        [PropertyType.LAND]: 0,
        [PropertyType.OTHER]: 0
      };
      
      typeCountResult.rows.forEach((row: any) => {
        const propertyType = row.property_type as PropertyType;
        if (propertyType in propertiesByType) {
          propertiesByType[propertyType] = parseInt(row.count, 10);
        }
      });

      return {
        totalProperties: parseInt(stats.total_properties, 10),
        translatedProperties: parseInt(stats.translated_properties, 10),
        pendingTranslation: parseInt(stats.pending_translation, 10),
        failedTranslation: parseInt(stats.failed_translation, 10),
        avgPrice: stats.avg_price ? parseFloat(stats.avg_price) : undefined,
        minPrice: stats.min_price ? parseFloat(stats.min_price) : undefined,
        maxPrice: stats.max_price ? parseFloat(stats.max_price) : undefined,
        sourceWebsites: parseInt(stats.source_websites, 10),
        lastScraped: stats.last_scraped ? new Date(stats.last_scraped) : undefined,
        propertiesByType
      };
    } catch (error) {
      console.error('Error getting property stats:', error);
      throw error;
    }
  }

  // Upsert property (insert or update based on URL)
  async upsert(propertyData: CreatePropertyInput): Promise<Property> {
    const existingProperty = await this.findByUrl(propertyData.url);
    
    if (existingProperty) {
      // Update existing property
      const updated = await this.update({
        id: existingProperty.id,
        ...propertyData
      });
      if (!updated) {
        throw new Error('Failed to update property');
      }
      return updated;
    } else {
      // Create new property
      return this.create(propertyData);
    }
  }

  // Batch operations
  async createMany(properties: CreatePropertyInput[]): Promise<Property[]> {
    return db.transaction(async (client: PoolClient) => {
      const results: Property[] = [];
      
      for (const property of properties) {
        const query = `
          INSERT INTO properties (
            url, title, title_en, price, location, location_en, size_sqm,
            property_type, description, description_en, images, listing_date,
            source_website, translation_status
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
          )
          ON CONFLICT (url) DO UPDATE SET
            title = EXCLUDED.title,
            title_en = EXCLUDED.title_en,
            price = EXCLUDED.price,
            location = EXCLUDED.location,
            location_en = EXCLUDED.location_en,
            size_sqm = EXCLUDED.size_sqm,
            property_type = EXCLUDED.property_type,
            description = EXCLUDED.description,
            description_en = EXCLUDED.description_en,
            images = EXCLUDED.images,
            listing_date = EXCLUDED.listing_date,
            source_website = EXCLUDED.source_website,
            translation_status = EXCLUDED.translation_status,
            updated_at = NOW()
          RETURNING *
        `;

        const values = [
          property.url,
          property.title,
          property.titleEn || null,
          property.price || null,
          property.location,
          property.locationEn || null,
          property.sizeSqm || null,
          property.propertyType || null,
          property.description || null,
          property.descriptionEn || null,
          JSON.stringify(property.images || []),
          property.listingDate || null,
          property.sourceWebsite,
          property.translationStatus || TranslationStatus.PENDING
        ];

        const result = await client.query(query, values);
        results.push(this.mapRowToProperty(result.rows[0]));
      }
      
      return results;
    });
  }

  // Helper methods
  private mapRowToProperty(row: any): Property {
    return {
      id: row.id,
      url: row.url,
      title: row.title,
      titleEn: row.title_en || undefined,
      price: row.price ? parseFloat(row.price) : undefined,
      location: row.location,
      locationEn: row.location_en || undefined,
      sizeSqm: row.size_sqm ? parseFloat(row.size_sqm) : undefined,
      propertyType: row.property_type || undefined,
      description: row.description || undefined,
      descriptionEn: row.description_en || undefined,
      images: row.images ? JSON.parse(row.images) : [],
      listingDate: row.listing_date ? new Date(row.listing_date) : undefined,
      sourceWebsite: row.source_website,
      translationStatus: row.translation_status as TranslationStatus,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  private buildWhereClause(filters: PropertyFilters): { whereClause: string; values: any[]; paramIndex: number } {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (filters.minPrice !== undefined) {
      conditions.push(`price >= $${paramIndex}`);
      values.push(filters.minPrice);
      paramIndex++;
    }

    if (filters.maxPrice !== undefined) {
      conditions.push(`price <= $${paramIndex}`);
      values.push(filters.maxPrice);
      paramIndex++;
    }

    if (filters.location) {
      conditions.push(`(location ILIKE $${paramIndex} OR location_en ILIKE $${paramIndex})`);
      values.push(`%${filters.location}%`);
      paramIndex++;
    }

    if (filters.propertyType) {
      conditions.push(`property_type = $${paramIndex}`);
      values.push(filters.propertyType);
      paramIndex++;
    }

    if (filters.minSize !== undefined) {
      conditions.push(`size_sqm >= $${paramIndex}`);
      values.push(filters.minSize);
      paramIndex++;
    }

    if (filters.maxSize !== undefined) {
      conditions.push(`size_sqm <= $${paramIndex}`);
      values.push(filters.maxSize);
      paramIndex++;
    }

    if (filters.sourceWebsite) {
      conditions.push(`source_website = $${paramIndex}`);
      values.push(filters.sourceWebsite);
      paramIndex++;
    }

    if (filters.translationStatus) {
      conditions.push(`translation_status = $${paramIndex}`);
      values.push(filters.translationStatus);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    return { whereClause, values, paramIndex };
  }

  private buildOrderByClause(sortBy?: string, sortOrder: 'ASC' | 'DESC' = 'DESC'): string {
    const validSortFields = ['price', 'size_sqm', 'listing_date', 'created_at', 'updated_at'];
    const field = validSortFields.includes(sortBy || '') ? this.camelToSnakeCase(sortBy!) : 'created_at';
    return `ORDER BY ${field} ${sortOrder}`;
  }

  private camelToSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}

// Export singleton instance
export const propertyRepository = new PropertyRepository();