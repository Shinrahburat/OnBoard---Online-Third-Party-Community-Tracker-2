const express = require('express');
const router = express.Router();
const sql = require('mssql');


module.exports = (pool) => {  
    
    //POST create new item request
    router.post('/', async (req, res) => {
        const { itemId, status, quantity, reason } = req.body;

        const companyCode = req.session.user.CompanyCode;
        const requestedBy = req.session.user.id;
        try {
            const poolRequest = pool.request();
            poolRequest.input('itemId', sql.NVarChar, itemId);
            poolRequest.input('status', sql.NVarChar, status);
            poolRequest.input('Quantity', sql.Int, quantity);
            poolRequest.input('Reason', sql.NVarChar, reason);
            poolRequest.input('CompanyCode', sql.NVarChar, companyCode);
            poolRequest.input('RequestedBy', sql.Int, requestedBy);
            await poolRequest.query(`
                INSERT INTO Item_Requests (itemid, status, requestQuantity, requestReason, CompanyCode, memberid )
                VALUES (@itemId, @status, @Quantity, @Reason, @CompanyCode, @RequestedBy)
            `);
            res.json({ success: true, message: 'Item request created successfully' });
        }
        catch (error) {
            console.error('Error creating item request:', error);
            res.status(500).json({ success: false, error: 'The requested quantity exceeds item stock' });
        }
    });


    //PUT update item request status
    router.put('/:requestId/status', async (req, res) => {
        const { requestId } = req.params;
        const { status } = req.body;
        try {
            const poolRequest = pool.request();
            poolRequest.input('RequestId', sql.Int, requestId);
            poolRequest.input('Status', sql.NVarChar, status);
            await poolRequest.query(`
                UPDATE Item_Requests
                SET Status = @Status
                WHERE RequestId = @RequestId
            `);
            res.json({ success: true, message: 'Item request status updated successfully' });
        }   catch (error) {
            console.error('Error updating item request status:', error);
            res.status(500).json({ success: false, error: 'Failed to update item request status' });
        }
    });

    //GET all item pending requests by company code
    router.get('/company/pending/:CompanyCode', async (req, res) => {
        const companyCode = req.session.user.CompanyCode;
        try {
            const result = await pool.request()
                .input('CompanyCode', sql.NVarChar, companyCode)
                .query(`
                    SELECT 
                        ir.*,
                        i.name AS itemName,
                        u.FirstName + ' ' + u.LastName AS requestedBy
                        FROM Inventory i join Item_Requests ir on  i.id = ir.itemid join Users u on ir.memberid = u.id
                        WHERE ir.CompanyCode = @CompanyCode and ir.status = 'Pending' Order by ir.id desc
                    `);
            res.json({ success: true, data: result.recordset });
        }
        catch (error) {
            console.error('Error fetching item requests by CompanyCode:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch item requests' });
        }
    });

    //GET item pending requests by request id 
    router.get('/approval/:requestid', async (req, res) => {
        const{ requestid } = req.params;
        try {
            const result = await pool.request()
                .input('id', sql.Int, requestid)
                .query(`
                    SELECT 
                        ir.*,
                        i.name AS itemName,
                        u.FirstName + ' ' + u.LastName AS requestedBy
                        FROM Inventory i join Item_Requests ir on  i.id = ir.itemid join Users u on ir.memberid = u.id
                        WHERE ir.id = @id Order by ir.id desc
                    `);
                
            res.json({ success: true, data: result.recordset[0] });
        }
        catch (error) {
            console.error('Error fetching item requests by request id:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch item requests' });
        }
    });

    //GET item requests by user id 
    router.get('/:userId', async (req, res) => {
        const{ userId } = req.params;
        try {
            const result = await pool.request()
                .input('id', sql.Int, userId)
                .query(`
                    SELECT 
                        ir.*,
                        i.name AS itemName,
                        u.FirstName + ' ' + u.LastName AS requestedBy
                        FROM Inventory i join Item_Requests ir on  i.id = ir.itemid join Users u on ir.memberid = u.id
                        WHERE u.id = @id Order by ir.id desc
                    `);
            res.json({ success: true, data: result.recordset });
        }
        catch (error) {
            console.error('Error fetching item requests by user id:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch item requests' });
        }
    });

    //GET item requeest data by request id
    router.get('/getRequest/:requestId', async(req, res) => {
        const{ requestId } = req.params;
        try{
            const result = await pool.request()
                .input('requestId',sql.Int, requestId)
                .query(`
                    select 
                        ir.*,
                        i.name as itemName,
                        u.FirstName + ' ' + u.LastName as requestedBy
                        from Inventory i join Item_Requests ir on i.id = ir.itemid join Users u on ir.memberid = u.id
                        where ir.id = @requestId 
                    `);
            res.json({success: true, data:result.recordset[0]});

                
        }
        catch(error){
            console.error('Error fetching item requests by request id:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch item requests' });
        }
    });

    //PUT update item status to 'Fulfilled' and adjust stock
    router.put('/approval/:requestId/approve', async (req, res) => {
        const { requestId } = req.params;
        try {
            const poolRequest = pool.request();
            poolRequest.input('RequestId', sql.Int, requestId);
            // Start a transaction
            const transaction = new sql.Transaction(pool);
            await transaction.begin();
            try {
                const request = new sql.Request(transaction);
                request.input('RequestId', sql.Int, requestId);
                // Update request status to 'Fulfilled'
                await request.query(`
                    UPDATE Item_Requests
                    SET Status = 'Approved'
                    WHERE id = @RequestId
                `);
                // Get itemId and requestQuantity
                const result = await request.query(`
                    SELECT itemid, requestQuantity
                    FROM Item_Requests
                    WHERE id = @RequestId
                `);
                const { itemid, requestQuantity } = result.recordset[0];
                // Decrease item stock
                request.input('ItemId', sql.Int, itemid);
                request.input('RequestQuantity', sql.Int, requestQuantity);
                await request.query(`
                    UPDATE Inventory
                    SET quantity = quantity - @RequestQuantity
                    WHERE id = @ItemId
                `);
                // Commit transaction
                await transaction.commit();
                res.json({ success: true, message: 'Item request fulfilled and stock updated successfully' });
            }
            catch (error) {
                // Rollback transaction on error
                await transaction.rollback();
                throw error;
            }
        }
        catch (error) {
            console.error('Error fulfilling item request:', error);
            res.status(500).json({ success: false, error: 'Failed to fulfill item request' });
        }
    });

    //PUT update item request status to 'Rejected'
    router.put('/approval/:requestId/reject', async (req, res) => {
        const { requestId } = req.params;
        try {
            const poolRequest = pool.request();
            poolRequest.input('RequestId', sql.Int, requestId);
            await poolRequest.query(`
                UPDATE Item_Requests
                SET status = 'Rejected'
                WHERE id = @RequestId
            `);
            res.json({ success: true, message: 'Item request rejected successfully' });
        }
        catch (error) {
            console.error('Error rejecting item request:', error);
            res.status(500).json({ success: false, error: 'Failed to reject item request' });
        }
    });

  return router;
};