const express = require('express');
const router = express.Router();
const sql = require('mssql');

module.exports = (pool) => {

    // GET all members by CompanyCode
    router.get('/company/:CompanyCode', async (req, res) => {
        const { CompanyCode } = req.params;

        try {
            const result = await pool.request()
                .input('CompanyCode', sql.NVarChar, CompanyCode)
                .query('SELECT * FROM Users WHERE CompanyCode = @CompanyCode');

            if (result.recordset.length === 0) {
                return res.status(404).json({ success: false, error: 'No members found for this company' });
            }

            res.json({ success: true, data: result.recordset, count: result.recordset.length });
        } catch (error) {
            console.error('Error fetching members by CompanyCode:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch members' });
        }
    });

    // GET member by ID + attendance + tasks + company + feedback info
    router.get('/:id', async (req, res) => {
        const { id } = req.params;
        const company = req.session.user?.CompanyCode;

        try {
            const result = await pool.request()
                .input('id', sql.Int, id)
                .query('SELECT * FROM Users WHERE id = @id');

            const companyResult = await pool.request()
                .input('companyCode', sql.NVarChar, company)
                .query('SELECT * from Organization where CompanyCode=@companyCode');

            const attendanceCountPresent = await pool.request()
                .input('id', sql.Int, id)
                .query(`SELECT COUNT(*) AS count FROM Attendance WHERE memberid = @id and status = 'Present'`);

            const attendanceCountAbsence = await pool.request()
                .input('id', sql.Int, id)
                .query(`SELECT COUNT(*) AS count FROM Attendance WHERE memberid = @id and status = 'Absent'`);

            const attendanceCountLate = await pool.request()
                .input('id', sql.Int, id)
                .query(`SELECT COUNT(*) AS count FROM Attendance WHERE memberid = @id and status = 'Late'`);

            const attendanceRate = await pool.request()
                .input('id', sql.NVarChar, id)
                .query(`
                SELECT 
                    (SUM(CASE WHEN status = 'Present' OR status = 'Late' THEN 1 ELSE 0 END) * 100.0) / NULLIF(COUNT(*), 0) AS PresentPercentage
                FROM Attendance
                WHERE memberid = @id;
            `);

            const taskCompleted = await pool.request()
                .input('id', sql.Int, id)
                .query(`SELECT COUNT(*) AS count FROM Tasks WHERE memberid = @id and status = 'Completed'`);

            const taskUnfinished = await pool.request()
                .input('id', sql.Int, id)
                .query(`SELECT COUNT(*) AS count FROM Tasks WHERE memberid = @id and status = 'Unfinished'`);

            const taskrate = await pool.request()
                .input('id', sql.NVarChar, id)
                .query(`
                SELECT 
                    (SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) * 100.0) / NULLIF(COUNT(*), 0) AS CompletedPercentage
                FROM Tasks
                WHERE memberid = @id;
            `);

            const attendancehistory = await pool.request()
                .input('id', sql.Int, id)
                .query(`SELECT * FROM Attendance WHERE memberid = @id ORDER BY date DESC`);

            const feedback = await pool.request()
                .input('id', sql.Int, id)
                .query(`SELECT count(*) as count FROM Feedback WHERE feedbackBy = @id`);

            if (result.recordset.length === 0) {
                return res.status(404).json({ success: false, error: 'Member not found' });
            }

            res.json({
                success: true,
                data: result.recordset[0],
                attendanceCountPresent: attendanceCountPresent.recordset[0].count,
                attendanceCountAbsence: attendanceCountAbsence.recordset[0].count,
                attendanceCountLate: attendanceCountLate.recordset[0].count,
                attendanceRate: attendanceRate.recordset[0].PresentPercentage || 0,
                taskCompleted: taskCompleted.recordset[0].count,
                taskUnfinished: taskUnfinished.recordset[0].count,
                taskrate: taskrate.recordset[0].CompletedPercentage || 0,
                attendancehistory: attendancehistory.recordset,
                companyResult: companyResult.recordset[0],
                feedback: feedback.recordset[0].count
            });

        } catch (error) {
            console.error('Error fetching member by ID:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch member' });
        }
    });

    // POST create new member
    router.post('/', async (req, res) => {
        try {
            const {
                FirstName,
                LastName,
                email,
                phoneNumber,
                password,
                role = 'Member',
                status = 'Active',
                address,
                notes = null,
                CompanyCode
            } = req.body;

            const checkEmail = await pool.request()
                .input('email', sql.NVarChar, email)
                .query('SELECT id FROM Users WHERE email = @email');

            if (checkEmail.recordset.length > 0) {
                return res.status(400).json({ success: false, error: 'Email already exists' });
            }

        const detdet = await pool.request()
            .query("SELECT CAST(GETDATE() AS DATE) AS today");

        const hiredDate = detdet.recordset[0]?.today;

        const validHiredDate = hiredDate
            ? hiredDate
            : new Date().toISOString().split("T")[0];

            const result = await pool.request()
                .input('FirstName', sql.NVarChar, FirstName)
                .input('LastName', sql.NVarChar, LastName)
                .input('email', sql.NVarChar, email)
                .input('phoneNumber', sql.NVarChar, phoneNumber || null)
                .input('password', sql.NVarChar, password)
                .input('role', sql.NVarChar, role)
                .input('status', sql.NVarChar, status)
                .input('hiredDate', sql.Date, validHiredDate)
                .input('address', sql.NVarChar, address || null)
                .input('notes', sql.NVarChar, notes)
                .input('CompanyCode', sql.NVarChar, CompanyCode)
                .query(`
                INSERT INTO Users 
                (FirstName, LastName, email, phoneNumber, password, role, status, hiredDate, address, notes, CompanyCode)
                OUTPUT INSERTED.id
                VALUES (@FirstName, @LastName, @email, @phoneNumber, @password, @role, @status, @hiredDate, @address, @notes, @CompanyCode)
            `);



            res.status(201).json({
                success: true,
                message: 'Member created successfully',
                data: { id: result.recordset[0].id, FirstName, LastName, email }
            });
        } catch (error) {
            console.error('=== CREATE USER ERROR ===');
            res.status(500).json({ success: false, error: 'Failed to create member', details: error.message });
        }
    });

    // PUT update member
    router.put('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { FirstName, LastName, email, phoneNumber, role, status, address, notes } = req.body;

            const checkMember = await pool.request()
                .input('id', sql.Int, id)
                .query('SELECT id FROM Users WHERE id = @id');

            if (checkMember.recordset.length === 0)
                return res.status(404).json({ success: false, error: 'Member not found' });

            const checkEmail = await pool.request()
                .input('email', sql.NVarChar, email)
                .input('id', sql.Int, id)
                .query('SELECT id FROM Users WHERE email = @email AND id != @id');

            if (checkEmail.recordset.length > 0)
                return res.status(400).json({ success: false, error: 'Email already exists' });

            await pool.request()
                .input('id', sql.Int, id)
                .input('FirstName', sql.NVarChar, FirstName)
                .input('LastName', sql.NVarChar, LastName)
                .input('email', sql.NVarChar, email)
                .input('phoneNumber', sql.NVarChar, phoneNumber)
                .input('role', sql.NVarChar, role)
                .input('status', sql.NVarChar, status)
                .input('address', sql.NVarChar, address)
                .input('notes', sql.NVarChar, notes)
                .query(`
                UPDATE Users 
                SET FirstName=@FirstName, LastName=@LastName, email=@email, 
                    phoneNumber=@phoneNumber, role=@role, status=@status,
                    address=@address, notes=@notes
                WHERE id=@id
            `);

            res.json({ success: true, message: 'Member updated successfully' });
        } catch (error) {
            res.status(500).json({ success: false, error: 'Failed to update member', details: error.message });
        }
    });

    //POST update member password
    router.put('/updatePass/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { password } = req.body;
            await pool.request()
                .input('id', sql.Int, id)
                .input('password', sql.NVarChar, password)
                .query(`
                UPDATE Users 
                SET password=@password
                WHERE id=@id
            `);
            res.json({ success: true, message: 'Password updated successfully' });
        } catch (error) {
            res.status(500).json({ success: false, error: 'Failed to update password', details: error.message });
        }
    });

    // DELETE member
    router.delete('/members/:id', async (req, res) => {
        try {
            const result = await pool.request()
                .input('id', sql.Int, req.params.id)
                .query('DELETE FROM Users WHERE id = @id');

            if (result.rowsAffected[0] === 0)
                return res.status(404).json({ success: false, error: 'Member not found' });

            res.json({ success: true, message: 'Member deleted successfully' });
        } catch (error) {
            res.status(500).json({ success: false, error: 'Failed to delete member' });
        }
    });

    // CHECK community code exists
    router.get('/check-community/:code', async (req, res) => {
        const { code } = req.params;

        try {
            const result = await pool.request()
                .input('code', sql.NVarChar, code)
                .query('SELECT COUNT(*) AS count FROM Organization WHERE CompanyCode = @code');

            res.json({ exists: result.recordset[0].count > 0 });
        } catch (error) {
            res.status(500).json({ exists: false, error: 'Database error' });
        }
    });

    // GET data count by organization
    router.get('/company/:companyCode/count', async (req, res) => {
        const { companyCode } = req.params;

        try {
            const resultMember = await pool.request()
                .input('CompanyCode', sql.NVarChar, companyCode)
                .query('SELECT COUNT(*) AS count FROM Users WHERE CompanyCode = @CompanyCode');

            const resultDocument = await pool.request()
                .input('CompanyCode', sql.NVarChar, companyCode)
                .query('SELECT COUNT(*) AS count FROM Documents WHERE CompanyCode = @CompanyCode');

            const resultAnnouncement = await pool.request()
                .input('CompanyCode', sql.NVarChar, companyCode)
                .query('SELECT COUNT(*) AS count FROM Announcements WHERE CompanyCode = @CompanyCode');

            const resultInventory = await pool.request()
                .input('CompanyCode', sql.NVarChar, companyCode)
                .query('SELECT COUNT(*) AS count FROM Inventory WHERE CompanyCode = @CompanyCode');

            const completedTasksResult = await pool.request()
                .input('CompanyCode', sql.NVarChar, companyCode)
                .query("SELECT COUNT(*) AS count FROM Tasks WHERE CompanyCode = @CompanyCode AND status = 'Completed'");

            const resultAttendance = await pool.request()
                .input('CompanyCode', sql.NVarChar, companyCode)
                .query(`
                SELECT 
                    CASE WHEN COUNT(*) = 0 THEN 0
                         ELSE (SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) * 100.0) / COUNT(*)
                    END AS PresentPercentage
                FROM Attendance
                WHERE CompanyCode = @CompanyCode;
            `);

            res.json({
                success: true,
                countMember: resultMember.recordset[0].count,
                countDocument: resultDocument.recordset[0].count,
                countAnnouncement: resultAnnouncement.recordset[0].count,
                countTask: completedTasksResult.recordset[0].count,
                countAttendance: resultAttendance.recordset[0].PresentPercentage,
                countInventory: resultInventory.recordset[0].count
            });

        } catch (error) {
            res.status(500).json({ success: false, error: 'Failed to count members' });
        }
    });

    return router;
};