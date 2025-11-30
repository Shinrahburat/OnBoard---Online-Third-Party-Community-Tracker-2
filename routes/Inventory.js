const express = require('express');
const router = express.Router();
const sql = require('mssql');

module.exports = (pool) => {

    // GET all inventory items + computed stats by companyCode
    router.get('/company/:companyCode', async (req, res) => {
        const { companyCode } = req.params;

        try {
            const result = await pool.request()
                .input('CompanyCode', sql.NVarChar, companyCode)
                .query(`
                    SELECT 
                        *
                    FROM Inventory
                    WHERE CompanyCode = @CompanyCode
                    ORDER BY id ASC
                `);

            const itemCount = await pool.request()
                .input('CompanyCode', sql.NVarChar, companyCode)
                .query('SELECT COUNT(*) AS count FROM Inventory WHERE CompanyCode = @CompanyCode');

            const itemLowOnStock = await pool.request()
                .input('CompanyCode', sql.NVarChar, companyCode)
                .query("SELECT COUNT(*) AS count FROM Inventory WHERE CompanyCode = @CompanyCode and status = 'Low on Stock'");

            const itemOutStock = await pool.request()
                .input('CompanyCode', sql.NVarChar, companyCode)
                .query("SELECT COUNT(*) AS count FROM Inventory WHERE CompanyCode = @CompanyCode and status = 'Out of Stock'");

            const itemInStock = await pool.request()
                .input('CompanyCode', sql.NVarChar, companyCode)
                .query("SELECT COUNT(*) AS count FROM Inventory WHERE CompanyCode = @CompanyCode and status = 'In Stock'");

            res.json({
                success: true,
                data: result.recordset,
                itemCount: itemCount.recordset[0].count,
                itemLowOnStock: itemLowOnStock.recordset[0].count,
                itemOutStock: itemOutStock.recordset[0].count,
                itemInStock: itemInStock.recordset[0].count
            });

        } catch (error) {
            console.error("Error fetching inventory:", error);
            res.status(500).json({ success: false, error: "Failed to fetch inventory" });
        }
    });

    // POST add new inventory item
    router.post('/', async (req, res) => {
        const { name, category, quantity, companyCode } = req.body;

        try {
            await pool.request()
                .input('ItemName', sql.NVarChar, name)
                .input('Category', sql.NVarChar, category)
                .input('Quantity', sql.Int, quantity)
                .input('CompanyCode', sql.NVarChar, companyCode)
                .query(`
                    INSERT INTO Inventory (name, category, quantity, CompanyCode)
                    VALUES (@ItemName, @Category, @Quantity, @CompanyCode)
                `);

            res.json({ success: true });

        } catch (error) {
            console.error("Insert error:", error);
            res.status(500).json({ success: false, error: "Insert failed" });
        }
    });

    // PUT update inventory item by ID
    router.put('/:id', async (req, res) => {
        const { id } = req.params;
        const { name, category, quantity } = req.body;

        try {
            await pool.request()
                .input('id', sql.Int, id)
                .input('ItemName', sql.NVarChar, name)
                .input('Category', sql.NVarChar, category)
                .input('Quantity', sql.Int, quantity)
                .query(`
                    UPDATE Inventory
                    SET 
                        name = @ItemName,
                        category = @Category,
                        quantity = @Quantity
                    WHERE id = @id
                `);

            res.json({ success: true });

        } catch (error) {
            console.error("Update error:", error);
            res.status(500).json({ success: false, error: "Update failed" });
        }
    });

    // DELETE inventory item by ID
    router.delete('/:id', async (req, res) => {
        const { id } = req.params;

        try {
            await pool.request()
                .input('id', sql.Int, id)
                .query(`
                    DELETE FROM Inventory WHERE id = @id
                `);

            res.json({ success: true });

        } catch (error) {
            console.error("Delete error:", error);
            res.status(500).json({ success: false, error: "Delete failed" });
        }
    });

    //GET item data by item id
    router.get('/:itemId', async (req,res) => {
        const {itemId} = req.params;

        try{
            const result = await pool.request()
                .input('itemId', sql.Int, itemId)
                .query('select * from Inventory where id = @itemId');

                res.json({success: true, data: result.recordset[0]});
        }catch(error){
            console.error("Get error:", error);
            res.status(500).json({success: false, error: "Get Failed"});
        }
    })

    return router;
};
