const express = require('express');
const router = express.Router();
const sql = require('mssql');

module.exports = (pool) => {       

    
    //GET all logs by company code - Founder
    router.get('/company/:CompanyCode', async (req, res) => {
        const { CompanyCode } = req.params;

        try {
            const result = await pool.request()
                .input('CompanyCode', sql.NVarChar, CompanyCode)
                .query('SELECT * FROM Logs WHERE CompanyCode = @CompanyCode ORDER BY date DESC');

                if(result.recordset.memberid != null){
                    const resultUser = await pool.request()
                    .input('CompanyCode')
                }

            res.json({ success: true, data: result.recordset });
        } catch (error) {
            console.error('Error fetching logs by CompanyCode:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch logs' });
        }
    });

    //GET all logs by user ID and Announcements
    router.get('/user/:Id', async (req, res) => {
        const { Id } = req.params;
        const CompanyCode = req.session.user.CompanyCode;

        try {
            const result = await pool.request()
                .input('userId', sql.Int, Id)
                .input('CompanyCode', sql.NVarChar, CompanyCode)
                .query(`SELECT * FROM Logs WHERE CompanyCode = @CompanyCode and memberid in (@userId, null) ORDER BY date DESC`);
            res.json({ success: true, data: result.recordset });
        } catch (error) {
            console.error('Error fetching logs by CompanyCode:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch logs' });
        }
    });

    //POST Announcement Log
    router.post('/announcement', async (req , res) => {
        const {Announcement_Type, title, CompanyCode} = req.body

        try{
            const result = await pool.request()
                .input('type',sql.NVarChar, Announcement_Type)
                .input('title', sql.NVarChar, title)
                .input('CompanyCode', sql.NVarChar, CompanyCode)
                .query(`insert into Logs (Activity, date, CompanyCode, status_type,logType)
                        values('New Announcement: ' + @title, getdate(), @CompanyCode, @type,'Announcement')
                    `);

                res.json({success: true, message: 'Announcement Logged Successfully'})
        } catch(error){
            console.error('=== Announcement Log SUBMIT ERROR ===', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to submit announcement log',
                    details: error.message
                });
        }
    });

    //POST Feedback log
    router.post('/feedback', async (req, res) => {
        const {subject, status, userId, CompanyCode} = req.body

        try{
            const result = await pool.request()
                .input('status',sql.NVarChar, status)
                .input('subject', sql.NVarChar, subject)
                .input('CompanyCode', sql.NVarChar, CompanyCode)
                .input('userId', sql.Int, userId)
                .query(`insert into Logs (Activity, date, CompanyCode, status_type, memberid, logType)
                        values('New Feedback: ' + @subject, getdate(), @CompanyCode, @status, @userId, 'Feedback')
                    `);

                res.json({success: true, message: 'Feedback Logged Successfully'})
        } catch(error){
            console.error('=== Feedback Log SUBMIT ERROR ===', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to submit Feedback log',
                    details: error.message
                });
        }
    });

    //POST Feedback update
    router.post('/feedback/update', async (req, res) => {
        const {subject, status, userId, CompanyCode} = req.body

        try{
            const result = await pool.request()
                .input('status',sql.NVarChar, status)
                .input('subject', sql.NVarChar, subject)
                .input('CompanyCode', sql.NVarChar, CompanyCode)
                .input('userId', sql.Int, userId)
                .query(`insert into Logs (Activity, date, CompanyCode, status_type, memberid, logType)
                        values('Feedback Update: ' + @subject, getdate(), @CompanyCode, @status, @userId, 'Feedback')
                    `);

                res.json({success: true, message: 'Feedback Update Logged Successfully'})
        } catch(error){
            console.error('=== Feedback Update Log SUBMIT ERROR ===', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to submit Feedback Update log',
                    details: error.message
                });
        }
    });

    //POST Documents log
    router.post('/document', async (req, res) => {
        const {name, type, CompanyCode} = req.body

        try{
            const result = await pool.request()
                .input('type',sql.NVarChar, type)
                .input('name', sql.NVarChar, name)
                .input('CompanyCode', sql.NVarChar, CompanyCode)
                .query(`insert into Logs (Activity, date, CompanyCode, status_type, logType)
                        values('New Shared Document: ' + @name, getdate(), @CompanyCode, @type, 'Document')
                    `);

                res.json({success: true, message: 'Document Logged Successfully'})
        } catch(error){
            console.error('=== Document Log SUBMIT ERROR ===', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to submit Document log',
                    details: error.message
                });
        }
    });

    //POST Tasks log
    router.post('/task', async (req, res) => {
        const {title, status, CompanyCode, userId} = req.body

        try{
            const result = await pool.request()
                .input('type',sql.NVarChar, status)
                .input('name', sql.NVarChar, title)
                .input('CompanyCode', sql.NVarChar, CompanyCode)
                .input('userId', sql.Int, userId)
                .query(`insert into Logs (Activity, date, CompanyCode, status_type,memberid,logType)
                        values('New Task: ' + @name, getdate(), @CompanyCode, @type,@userId,'Task')
                    `);

                res.json({success: true, message: 'Task Logged Successfully'})
        } catch(error){
            console.error('=== Task Log SUBMIT ERROR ===', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to submit Task log',
                    details: error.message
                });
        }
    });

    //POST Task Update log
    router.post('/task/update', async (req, res) => {
        const {title, status, CompanyCode, userId} = req.body

        try{
            const result = await pool.request()
                .input('type',sql.NVarChar, status)
                .input('name', sql.NVarChar, title)
                .input('CompanyCode', sql.NVarChar, CompanyCode)
                .input('userId', sql.Int, userId)
                .query(`insert into Logs (Activity, date, CompanyCode, status_type,memberid,logType)
                        values('Update Task: ' + @name, getdate(), @CompanyCode, @type,@userId,'Task')
                    `);

                res.json({success: true, message: 'Task Logged Successfully'})
        } catch(error){
            console.error('=== Task Log SUBMIT ERROR ===', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to submit Task log',
                    details: error.message
                });
        }
    });

    //POST Inventory Request
    router.post('/item_request', async (req, res) => {
        const { status, CompanyCode, userId, itemId} = req.body

        try{

            const item = await pool.request()
                .input('itemId', sql.Int,itemId)
                .query('select name from Inventory where id = @itemId')

            const itemName = item.recordset[0].name;

            const result = await pool.request()
                .input('type',sql.NVarChar, status)
                .input('name', sql.NVarChar, itemName)
                .input('CompanyCode', sql.NVarChar, CompanyCode)
                .input('userId', sql.Int, userId)
                .query(`insert into Logs (Activity, date, CompanyCode, status_type,memberid,logType)
                        values('New Item Requested: ' + @name, getdate(), @CompanyCode, @type, @userId,'Request')
                    `);

                res.json({success: true, message: 'Item Request Logged Successfully'})
        } catch(error){
            console.error('=== Item Request SUBMIT ERROR ===', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to submit Item Request',
                    details: error.message
                });
        }
    });


    //POST Inventory Request Update
    router.post('/item_request/update', async (req, res) => {
        const { status, CompanyCode, userId, itemId} = req.body

        try{

            const item = await pool.request()
                .input('itemId', sql.Int,itemId)
                .query('select name from Inventory where id = @itemId')

            const itemName = item.recordset[0].name;

            const result = await pool.request()
                .input('type',sql.NVarChar, status)
                .input('name', sql.NVarChar, itemName)
                .input('CompanyCode', sql.NVarChar, CompanyCode)
                .input('userId', sql.Int, userId)
                .query(`insert into Logs (Activity, date, CompanyCode, status_type,memberid, logType)
                        values('Update Item Requested: ' + @name, getdate(), @CompanyCode, @type, @userId, 'Feedback')
                    `);

                res.json({success: true, message: 'Item Request Logged Successfully'})
        } catch(error){
            console.error('=== Item Request SUBMIT ERROR ===', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to submit Item Request',
                    details: error.message
                });
        }
    });
    
    //POST New Inventory Item
    router.post('/inventory/', async (req, res) => {
        const { name, category, CompanyCode} = req.body

        try{ 
            const result = await pool.request()
                .input('type',sql.NVarChar, category)
                .input('name', sql.NVarChar, name)
                .input('CompanyCode', sql.NVarChar, CompanyCode)
                .query(`insert into Logs (Activity, date, CompanyCode, status_type,logType)
                        values('New Item Added: ' + @name, getdate(), @CompanyCode, @type,'Inventory')
                    `);

                res.json({success: true, message: 'New Inventory Logged Successfully'})
        } catch(error){
            console.error('=== New Inventory  SUBMIT ERROR ===', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to submit New Inventory ',
                    details: error.message
                });
        }
    });


    //POST Inventory Restock
    router.post('/inventory/restock', async (req, res) => {
        const { name, category, CompanyCode} = req.body

        try{ 
            const result = await pool.request()
                .input('type',sql.NVarChar, category)
                .input('name', sql.NVarChar, name)
                .input('CompanyCode', sql.NVarChar, CompanyCode)
                .query(`insert into Logs (Activity, date, CompanyCode, status_type,logType)
                        values('Item Restocked: ' + @name, getdate(), @CompanyCode, @type, 'Inventory')
                    `);

                res.json({success: true, message: 'Restock Inventory Logged Successfully'})
        } catch(error){
            console.error('=== Restock Inventory  SUBMIT ERROR ===', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to submit Restock Inventory ',
                    details: error.message
                });
        }
    });
    
    //POST New Member Log
    router.post('/member', async (req, res) => {
        const { name, category, CompanyCode} = req.body

        try{ 
            
            const result = await pool.request()
                .input('type',sql.NVarChar, category)
                .input('name', sql.NVarChar, name)
                .input('CompanyCode', sql.NVarChar, CompanyCode)
                .query(`insert into Logs (Activity, date, CompanyCode, status_type,logType)
                        values('Welcome New Member: ' + @name, getdate(), @CompanyCode, @type,'User')
                    `);

                res.json({success: true, message: 'New Member Logged Successfully'})
        } catch(error){
            console.error('=== New Member SUBMIT ERROR ===', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to submit New Member ',
                    details: error.message
                });
        }
    });

    return router;
};
