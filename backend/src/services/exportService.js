import XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';

class ExportService {
    constructor() {
        // Ensure exports directory exists
        this.exportsDir = path.join(process.cwd(), 'exports');
        if (!fs.existsSync(this.exportsDir)) {
            fs.mkdirSync(this.exportsDir, { recursive: true });
        }
    }

    async exportAppointments(appointments, options = {}) {
        try {
            const { format = 'xlsx', includeStats = true } = options;

            // Transform appointments data for Excel
            const appointmentData = appointments.map(appointment => ({
                'Date': new Date(appointment.appointmentDate).toLocaleDateString('en-IN'),
                'Time': appointment.appointmentTime,
                'Patient Name': appointment.patientId?.name || 'N/A',
                'Patient Age': appointment.patientId?.age || 'N/A',
                'Patient Gender': appointment.patientId?.gender || 'N/A',
                'Medical Condition': appointment.patientId?.medicalCondition || 'N/A',
                'Patient Contact': appointment.patientId?.contactNumber || 'N/A',
                'Doctor Name': appointment.doctorId?.name || 'N/A',
                'Doctor Specialization': appointment.doctorId?.specialization || 'N/A',
                'Clinic Name': appointment.doctorId?.clinicName || 'N/A',
                'Doctor Contact': appointment.doctorId?.contactNumber || 'N/A',
                'Mode': appointment.modeOfAppointment,
                'Status': appointment.status.toUpperCase(),
                'Booked By': appointment.bookedBy?.name || 'N/A',
                'Booked By Role': appointment.bookedBy?.role?.toUpperCase() || 'N/A',
                'Notes': appointment.notes || '',
                'Created Date': new Date(appointment.createdAt).toLocaleDateString('en-IN'),
                'Updated Date': new Date(appointment.updatedAt).toLocaleDateString('en-IN')
            }));

            // Create workbook
            const workbook = XLSX.utils.book_new();

            // Add appointments sheet
            const appointmentSheet = XLSX.utils.json_to_sheet(appointmentData);
            XLSX.utils.book_append_sheet(workbook, appointmentSheet, 'Appointments');

            // Add statistics sheet if requested
            if (includeStats && appointments.length > 0) {
                const stats = this.calculateAppointmentStats(appointments);
                const statsSheet = XLSX.utils.json_to_sheet([stats]);
                XLSX.utils.book_append_sheet(workbook, statsSheet, 'Statistics');
            }

            // Generate filename
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `appointments-export-${timestamp}.${format}`;
            const filepath = path.join(this.exportsDir, filename);

            // Write file
            XLSX.writeFile(workbook, filepath);

            return { filename, filepath };
        } catch (error) {
            throw new Error(`Failed to export appointments: ${error.message}`);
        }
    }

    async exportReferrals(referrals, options = {}) {
        try {
            const { format = 'xlsx', includeStats = true } = options;

            // Transform referrals data for Excel
            const referralData = referrals.map(referral => ({
                'Referral ID': referral._id.toString(),
                'Patient Name': referral.patientId?.name || 'N/A',
                'Patient Age': referral.patientId?.age || 'N/A',
                'Patient Gender': referral.patientId?.gender || 'N/A',
                'Medical Condition': referral.patientId?.medicalCondition || 'N/A',
                'Patient Contact': referral.patientId?.contactNumber || 'N/A',
                'Doctor Name': referral.doctorId?.name || 'N/A',
                'Doctor Specialization': referral.doctorId?.specialization || 'N/A',
                'Clinic Name': referral.doctorId?.clinicName || 'N/A',
                'Doctor Contact': referral.doctorId?.contactNumber || 'N/A',
                'Agent Name': referral.agentId?.name || 'N/A',
                'Agent Contact': referral.agentId?.contactNumber || 'N/A',
                'Broker Name': referral.brokerId?.name || 'N/A',
                'Broker Contact': referral.brokerId?.contactNumber || 'N/A',
                'Commission Amount': referral.commissionAmount || 0,
                'Status': referral.status.toUpperCase(),
                'Referral Type': referral.referralType || 'agent-to-doctor',
                'Referring Doctor': referral.referringDoctorId?.name || 'N/A',
                'Referral Reason': referral.referralReason || 'N/A',
                'Urgency Level': referral.urgencyLevel || 'medium',
                'Notes': referral.notes || '',
                'Response Notes': referral.responseNotes || '',
                'Created Date': new Date(referral.createdAt).toLocaleDateString('en-IN'),
                'Updated Date': new Date(referral.updatedAt).toLocaleDateString('en-IN'),
                'Responded Date': referral.respondedAt ? new Date(referral.respondedAt).toLocaleDateString('en-IN') : 'N/A'
            }));

            // Create workbook
            const workbook = XLSX.utils.book_new();

            // Add referrals sheet
            const referralSheet = XLSX.utils.json_to_sheet(referralData);
            XLSX.utils.book_append_sheet(workbook, referralSheet, 'Referrals');

            // Add statistics sheet if requested
            if (includeStats && referrals.length > 0) {
                const stats = this.calculateReferralStats(referrals);
                const statsSheet = XLSX.utils.json_to_sheet([stats]);
                XLSX.utils.book_append_sheet(workbook, statsSheet, 'Statistics');
            }

            // Generate filename
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `referrals-export-${timestamp}.${format}`;
            const filepath = path.join(this.exportsDir, filename);

            // Write file
            XLSX.writeFile(workbook, filepath);

            return { filename, filepath };
        } catch (error) {
            throw new Error(`Failed to export referrals: ${error.message}`);
        }
    }

    calculateAppointmentStats(appointments) {
        const total = appointments.length;
        const statusCounts = appointments.reduce((acc, appointment) => {
            acc[appointment.status] = (acc[appointment.status] || 0) + 1;
            return acc;
        }, {});

        const modeCounts = appointments.reduce((acc, appointment) => {
            acc[appointment.modeOfAppointment] = (acc[appointment.modeOfAppointment] || 0) + 1;
            return acc;
        }, {});

        return {
            'Total Appointments': total,
            'Pending Appointments': statusCounts.pending || 0,
            'Confirmed Appointments': statusCounts.confirmed || 0,
            'Completed Appointments': statusCounts.completed || 0,
            'Cancelled Appointments': statusCounts.cancelled || 0,
            'Physical Appointments': modeCounts.physical || 0,
            'Video Call Appointments': modeCounts.video_call || 0,
            'Phone Call Appointments': modeCounts.call || 0,
            'Export Generated': new Date().toISOString()
        };
    }

    calculateReferralStats(referrals) {
        const total = referrals.length;
        const statusCounts = referrals.reduce((acc, referral) => {
            acc[referral.status] = (acc[referral.status] || 0) + 1;
            return acc;
        }, {});

        const totalCommission = referrals
            .filter(r => r.status === 'completed')
            .reduce((sum, r) => sum + (r.commissionAmount || 0), 0);

        const typeCounts = referrals.reduce((acc, referral) => {
            const type = referral.referralType || 'agent-to-doctor';
            acc[type] = (acc[type] || 0) + 1;
            return acc;
        }, {});

        return {
            'Total Referrals': total,
            'Pending Referrals': statusCounts.pending || 0,
            'Accepted Referrals': statusCounts.accepted || 0,
            'Completed Referrals': statusCounts.completed || 0,
            'Rejected Referrals': statusCounts.rejected || 0,
            'Agent to Doctor Referrals': typeCounts['agent-to-doctor'] || 0,
            'Doctor to Doctor Referrals': typeCounts['doctor-to-doctor'] || 0,
            'Total Commission': totalCommission,
            'Average Commission': total > 0 ? (totalCommission / statusCounts.completed || 1).toFixed(2) : 0,
            'Export Generated': new Date().toISOString()
        };
    }
}

export default new ExportService();
