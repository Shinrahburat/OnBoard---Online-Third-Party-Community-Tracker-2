const express = require('express');
const router = express.Router();
const sql = require('mssql');

module.exports = (pool) => {       

    
    // GET all announcements by CompanyCode
    router.get('/company/:CompanyCode', async (req, res) => {
        const { CompanyCode } = req.params;
        const { filter } = req.query;
    
        try {
            let query = 'SELECT * FROM Announcements WHERE CompanyCode = @CompanyCode order by time_Stamp desc';
            
            if (filter && filter !== 'all') {
                query += ' AND Announcement_Type = @filter';
            }
            
            const request = pool.request()
                .input('CompanyCode', sql.NVarChar, CompanyCode);
            
            if (filter && filter !== 'all') {
                request.input('filter', sql.VarChar, filter);
            }
    
            const result = await request.query(query);
    
            res.json({ success: true, data: result.recordset });
        } catch (error) {
            console.error('Error fetching announcements:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch announcements' });
        }
    });
    
    // POST create new announcement
    router.post('/', async (req, res) => {
        try {
            const {
                type,
                title,
                content,
                author,
                authorRole,
                CompanyCode,
            } = req.body;
    
            if (!type || !title || !content || !author || !authorRole || !CompanyCode) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'All fields are required' 
                });
            }
    
            const result = await pool.request()
                .input('Announcement_Type', sql.VarChar, type)
                .input('title', sql.NVarChar, title)
                .input('content', sql.NVarChar, content)
                .input('author', sql.NVarChar, author)
                .input('authorRole', sql.NVarChar, authorRole)
                .input('CompanyCode', sql.NVarChar, CompanyCode)
    
                .query(`
                    INSERT INTO Announcements (Announcement_Type, title, content, author, authorRole, CompanyCode)
                    OUTPUT INSERTED.*
                    VALUES (@Announcement_Type, @title, @content, @author, @authorRole, @CompanyCode)
                `);
    
            res.status(201).json({
                success: true,
                message: 'Announcement created successfully',
                data: result.recordset[0]
            });
        } catch (error) {
            console.error('Error creating announcement:', error);
            res.status(500).json({ success: false, error: 'Failed to create announcement' });
        }
    });
    
    // DELETE announcement
    router.delete('/:id', async (req, res) => {
        try {
            const { id } = req.params;
    
            const result = await pool.request()
                .input('id', sql.Int, id)
                .query('DELETE FROM Announcements WHERE id = @id');
    
            if (result.rowsAffected[0] === 0) {
                return res.status(404).json({ success: false, error: 'Announcement not found' });
            }
    
            res.json({ success: true, message: 'Announcement deleted successfully' });
        } catch (error) {
            console.error('Error deleting announcement:', error);
            res.status(500).json({ success: false, error: 'Failed to delete announcement' });
        }
    });
    
    return router;
};
