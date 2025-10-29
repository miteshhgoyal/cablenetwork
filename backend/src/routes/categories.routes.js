// backend/src/routes/categories.js
import express from 'express';
import { authenticateToken } from '../middlewares/auth.js';
import Category from '../models/Category.js';

const router = express.Router();

// Get all categories (with optional search)
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { search, type } = req.query;

        let query = {};

        // Add search filter
        if (search) {
            query.name = { $regex: search, $options: 'i' };
        }

        // Add type filter
        if (type) {
            query.type = type;
        }

        const categories = await Category.find(query)
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            data: { categories }
        });

    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch categories'
        });
    }
});

// Get single category
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        res.json({
            success: true,
            data: { category }
        });

    } catch (error) {
        console.error('Get category error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch category'
        });
    }
});

// Create category
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { name, type } = req.body;

        // Validation
        if (!name || !type) {
            return res.status(400).json({
                success: false,
                message: 'Name and type are required'
            });
        }

        if (!['Language', 'Genre'].includes(type)) {
            return res.status(400).json({
                success: false,
                message: 'Type must be either Language or Genre'
            });
        }

        // Check if category already exists
        const existingCategory = await Category.findOne({
            name: name.trim(),
            type
        });

        if (existingCategory) {
            return res.status(400).json({
                success: false,
                message: 'Category with this name and type already exists'
            });
        }

        const category = new Category({
            name: name.trim(),
            type
        });

        await category.save();

        res.status(201).json({
            success: true,
            message: 'Category created successfully',
            data: { category }
        });

    } catch (error) {
        console.error('Create category error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create category'
        });
    }
});

// Update category
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { name, type } = req.body;

        // Validation
        if (!name || !type) {
            return res.status(400).json({
                success: false,
                message: 'Name and type are required'
            });
        }

        if (!['Language', 'Genre'].includes(type)) {
            return res.status(400).json({
                success: false,
                message: 'Type must be either Language or Genre'
            });
        }

        const category = await Category.findById(req.params.id);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        // Check if updated name+type combination already exists
        const existingCategory = await Category.findOne({
            name: name.trim(),
            type,
            _id: { $ne: req.params.id }
        });

        if (existingCategory) {
            return res.status(400).json({
                success: false,
                message: 'Category with this name and type already exists'
            });
        }

        category.name = name.trim();
        category.type = type;

        await category.save();

        res.json({
            success: true,
            message: 'Category updated successfully',
            data: { category }
        });

    } catch (error) {
        console.error('Update category error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update category'
        });
    }
});

// Delete category
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        await category.deleteOne();

        res.json({
            success: true,
            message: 'Category deleted successfully'
        });

    } catch (error) {
        console.error('Delete category error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete category'
        });
    }
});

export default router;
