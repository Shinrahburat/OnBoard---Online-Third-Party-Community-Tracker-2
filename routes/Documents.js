const express = require('express');
const router = express.Router();
const sql = require('mssql');
const multer = require('multer');
const fs = require('fs');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + file.originalname;
        cb(null, uniqueName);
    }
});

const upload = multer({ storage });

module.exports = (pool) => {    
    
    
    // GET all documents by company code
    router.get('/company/:companyCode', async (req, res) => {
        const { companyCode } = req.params;
    
        if (!companyCode) {
            return res.status(400).json({ success: false, error: "CompanyCode is required" });
        }
    
        try {
            const result = await pool.request()
                .input('companyCode', sql.NVarChar, companyCode)
                .query(`
                    SELECT 
                        d.id,
                        d.name,
                        d.type,
                        u.FirstName +' '+ u.LastName AS owner,
                        DocURL AS filePath,
                        uploadOn AS uploadDate
                    FROM Documents d join Users u on d.uploadBy = u.id
                    WHERE d.CompanyCode = @companyCode
                    ORDER BY uploadOn DESC
                `);
            
            const sharedDocuments = await pool.request()
                .input('companyCode', sql.NVarChar, companyCode)
                .query(`
                    SELECT 
                        d.id,
                        d.name,
                        d.type,
                        u.FirstName +' '+ u.LastName AS owner,
                        DocURL AS filePath,
                        uploadOn AS uploadDate
                    FROM Documents d 
                    JOIN Users u on d.uploadBy = u.id
                    WHERE d.CompanyCode = @companyCode AND d.Access = 'Shared'
                    ORDER BY uploadOn DESC
                `);
            res.json({
                success: true,
                documents: result.recordset,
                sharedDocuments: sharedDocuments.recordset
            });
    
        } catch (err) {
            console.error("Error fetching documents:", err);
            res.status(500).json({ success: false, error: "Server error while fetching documents" });
        }
    });
    // GET download document by ID
    router.get('/download/:id', async (req, res) => {
        const { id } = req.params;

        try {
            const result = await pool.request()
                .input('id', sql.Int, id)
                .query('SELECT name, DocURL FROM Documents WHERE id = @id');

            if (!result.recordset.length) {
                return res.status(404).send("Document not found");
            }

            const doc = result.recordset[0];

            // 🧹 Remove the timestamp prefix before the first "-"
            const cleanName = doc.name.includes("-")
                ? doc.name.substring(doc.name.indexOf("-") + 1)
                : doc.name;

            // 👇 Send with the cleaned filename
            res.download(doc.DocURL, cleanName);

        } catch (err) {
            console.error("Download error:", err);
            res.status(500).send("Server error");
        }
    });

    // DELETE document by ID
    router.delete('/:id', async (req, res) => {
        const { id } = req.params;
    
        try {
            // Get file path first
            const result = await pool.request()
                .input('id', sql.Int, id)
                .query('SELECT DocURL FROM Documents WHERE id = @id');
    
            if (!result.recordset.length) {
                return res.status(404).json({ success: false, error: "Document not found" });
            }
    
            const filePath = result.recordset[0].DocURL;
    
            // Delete database record
            await pool.request()
                .input('id', sql.Int, id)
                .query('DELETE FROM Documents WHERE id = @id');
    
            // Delete file from disk
            fs.unlink(filePath, err => {
                if (err) console.error("Failed to delete file:", err);
            });
    
            res.json({ success: true });
        } catch (err) {
            console.error("Delete error:", err);
            res.status(500).json({ success: false, error: "Server error while deleting document" });
        }
    });


    // POST: Upload Document
    router.post('/task/upload', upload.single('DocumentFile'), async (req, res) => {
        try {
           const file = req.file; // multer
            const { taskDocAccess,taskId,owner,name, type, companyCode } = req.body;
    
    
            if (!file) {
                return res.status(400).json({ success: false, error: "No file uploaded" });
            }
    
            // Insert into SQL Server
            const result = await pool.request()
            .input('accessType', sql.NVarChar, taskDocAccess)
            .input('name', sql.NVarChar, name)
            .input('type', sql.NVarChar, type)
            .input('owner', sql.Int, owner)
            .input('DocURL', sql.NVarChar, file.path)
            .input('companyCode', sql.NVarChar, companyCode)
            .input('taskId', sql.Int, taskId)
            .query(`
                -- Insert into Documents and capture the new id
                DECLARE @NewDocumentId TABLE (id INT);

                INSERT INTO Documents (name, type, uploadBy, DocURL, uploadOn, CompanyCode, Access)
                OUTPUT inserted.id INTO @NewDocumentId
                VALUES (@name, @type, @owner, @DocURL, GETDATE(), @companyCode, @accessType);

                -- Update Tasks using the captured id
                UPDATE t
                SET t.status = 'Pending',
                    t.Outputid = n.id
                FROM Tasks t
                CROSS JOIN @NewDocumentId n
                WHERE t.id = @taskId;

                -- Return the new document id
                SELECT id AS documentId
                FROM @NewDocumentId;

            `);

        // Get the new document ID from result
        const documentId = result.recordset[0].documentId;
                
            res.json({
                success: true,
                message: "Document uploaded successfully",
                file: file,
                documentId: documentId
            });
    
        } catch (err) {
            console.error("Document upload error:", err);
            res.status(500).json({
                success: false,
                error: "Server error while uploading document"
            });
        }
    });

    router.post('/upload', upload.single('DocumentFile'), async (req, res) => {
        try {
           const file = req.file; // multer
            const { access,owner,name, type, companyCode } = req.body;
    
    
            if (!file) {
                return res.status(400).json({ success: false, error: "No file uploaded" });
            }
    
            // Insert into SQL Server
            const result = await pool.request()
            .input('accessType', sql.NVarChar, access)
            .input('name', sql.NVarChar, name)
            .input('type', sql.NVarChar, type)
            .input('owner', sql.Int, owner)
            .input('DocURL', sql.NVarChar, file.path)
            .input('companyCode', sql.NVarChar, companyCode)
            .query(`

                INSERT INTO Documents (name, type, uploadBy, DocURL, uploadOn, CompanyCode, Access)
                OUTPUT inserted.id INTO @NewDocumentId
                VALUES (@name, @type, @owner, @DocURL, GETDATE(), @companyCode, @accessType);

            `);

        // Get the new document ID from result
        const documentId = result.recordset[0].documentId;
                
            res.json({
                success: true,
                message: "Document uploaded successfully",
                file: file,
                documentId: documentId
            });
    
        } catch (err) {
            console.error("Document upload error:", err);
            res.status(500).json({
                success: false,
                error: "Server error while uploading document"
            });
        }
    });

    //GET documents by memberId
    router.get('/:id', async (req, res) => {
        const { id } = req.params;
        try {
            const result = await pool.request()
                .input('memberId', sql.Int, id)
                .query(`
                    SELECT 
                        d.id,
                        d.name,
                        d.type,
                        d.Access,
                        u.FirstName +' '+ u.LastName AS owner,
                        DocURL AS filePath,
                        uploadOn AS uploadDate
                    FROM Documents d join Users u on d.uploadBy = u.id
                    WHERE d.uploadBy = @memberId
                    ORDER BY uploadOn DESC
                `);

            res.json({
                success: true,
                documents: result.recordset
            });
        } catch (err) {
            console.error("Error fetching documents by memberId:", err);
            res.status(500).json({ success: false, error: "Server error while fetching documents" });
        }  
    });

    


    return router;
};
