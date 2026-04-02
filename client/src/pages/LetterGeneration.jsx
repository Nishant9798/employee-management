import { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { FileText, Printer, Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

const formatIndianRupees = (amount) => {
  if (!amount && amount !== 0) return 'N/A';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

const generateRefNumber = (type) => {
  const prefix = {
    offer: 'OFR',
    experience: 'EXP',
    salary: 'SAL',
    relieving: 'REL',
    appraisal: 'APR',
    warning: 'WRN',
  };
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const rand = String(Math.floor(Math.random() * 9000) + 1000);
  return `${prefix[type] || 'LTR'}/${year}/${month}/${rand}`;
};

const letterTemplates = [
  { value: 'offer', label: 'Offer Letter' },
  { value: 'experience', label: 'Experience Letter' },
  { value: 'salary', label: 'Salary Certificate' },
  { value: 'relieving', label: 'Relieving Letter' },
  { value: 'appraisal', label: 'Appraisal Letter' },
  { value: 'warning', label: 'Warning Letter' },
];

function LetterPreview({ type, data, letterDate, warningReason, refNumber }) {
  if (!data || !type) return null;

  const employee = data.employee || {};
  const company = data.company || {};
  const salary = data.salary || {};

  const companyName = company.company_name || 'Company Name';
  const companyAddress = company.company_address || '';
  const companyEmail = company.company_email || '';
  const companyPhone = company.company_phone || '';

  const empName = employee.name || 'Employee Name';
  const empId = employee.employee_id || employee.id || 'N/A';
  const designation = employee.designation || 'N/A';
  const department = employee.department || 'N/A';
  const joiningDate = employee.joining_date || employee.date_of_joining || '';
  const ctc = salary.ctc || salary.annual_ctc || 0;
  const basicSalary = salary.basic_salary || salary.basic || 0;
  const grossSalary = salary.gross_salary || salary.gross || 0;
  const netSalary = salary.net_salary || salary.net || 0;
  const hra = salary.hra || 0;
  const da = salary.da || salary.dearness_allowance || 0;
  const specialAllowance = salary.special_allowance || 0;
  const pf = salary.pf || salary.provident_fund || 0;
  const tax = salary.tax || salary.professional_tax || 0;
  const newSalary = salary.new_salary || salary.revised_salary || null;
  const newCtc = salary.new_ctc || salary.revised_ctc || null;

  const renderLetterhead = () => (
    <div className="text-center border-b-2 border-slate-800 dark:border-slate-300 pb-4 mb-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-wide uppercase">
        {companyName}
      </h1>
      {companyAddress && (
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{companyAddress}</p>
      )}
      <div className="flex justify-center gap-6 text-sm text-slate-600 dark:text-slate-400 mt-1">
        {companyEmail && <span>Email: {companyEmail}</span>}
        {companyPhone && <span>Phone: {companyPhone}</span>}
      </div>
    </div>
  );

  const renderDateAndRef = () => (
    <div className="flex justify-between items-start mb-6 text-sm text-slate-700 dark:text-slate-300">
      <div>
        <p><span className="font-semibold">Ref:</span> {refNumber}</p>
      </div>
      <div className="text-right">
        <p><span className="font-semibold">Date:</span> {formatDate(letterDate)}</p>
      </div>
    </div>
  );

  const renderSignature = () => (
    <div className="mt-16">
      <div className="mt-8">
        <p className="text-slate-700 dark:text-slate-300">Yours sincerely,</p>
        <div className="mt-12 border-t border-slate-400 dark:border-slate-500 w-48">
          <p className="mt-1 font-semibold text-slate-800 dark:text-slate-200">Authorized Signatory</p>
          <p className="text-sm text-slate-600 dark:text-slate-400">{companyName}</p>
        </div>
      </div>
    </div>
  );

  const renderOfferLetter = () => (
    <div>
      {renderLetterhead()}
      {renderDateAndRef()}
      <h2 className="text-center text-lg font-bold text-slate-900 dark:text-white underline mb-6 uppercase">
        Offer Letter
      </h2>
      <div className="space-y-4 text-slate-700 dark:text-slate-300 leading-relaxed">
        <p>To,</p>
        <p className="font-semibold">{empName}</p>

        <p>Dear {empName},</p>

        <p>
          We are pleased to offer you the position of <strong>{designation}</strong> in the{' '}
          <strong>{department}</strong> department at <strong>{companyName}</strong>. This letter
          confirms our offer of employment subject to the terms and conditions outlined below.
        </p>

        <div className="my-4">
          <table className="w-full border-collapse border border-slate-300 dark:border-slate-600 text-sm">
            <tbody>
              <tr className="border-b border-slate-300 dark:border-slate-600">
                <td className="p-2 font-semibold bg-slate-50 dark:bg-slate-700 w-1/3">Employee Name</td>
                <td className="p-2">{empName}</td>
              </tr>
              <tr className="border-b border-slate-300 dark:border-slate-600">
                <td className="p-2 font-semibold bg-slate-50 dark:bg-slate-700">Designation</td>
                <td className="p-2">{designation}</td>
              </tr>
              <tr className="border-b border-slate-300 dark:border-slate-600">
                <td className="p-2 font-semibold bg-slate-50 dark:bg-slate-700">Department</td>
                <td className="p-2">{department}</td>
              </tr>
              <tr className="border-b border-slate-300 dark:border-slate-600">
                <td className="p-2 font-semibold bg-slate-50 dark:bg-slate-700">Date of Joining</td>
                <td className="p-2">{formatDate(joiningDate)}</td>
              </tr>
              <tr className="border-b border-slate-300 dark:border-slate-600">
                <td className="p-2 font-semibold bg-slate-50 dark:bg-slate-700">Cost to Company (CTC)</td>
                <td className="p-2">{formatIndianRupees(ctc)} per annum</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="font-semibold mt-4">Salary Breakdown (Per Annum):</p>
        <div className="my-2">
          <table className="w-full border-collapse border border-slate-300 dark:border-slate-600 text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-700">
                <th className="p-2 text-left border-b border-slate-300 dark:border-slate-600">Component</th>
                <th className="p-2 text-right border-b border-slate-300 dark:border-slate-600">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-300 dark:border-slate-600">
                <td className="p-2">Basic Salary</td>
                <td className="p-2 text-right">{formatIndianRupees(basicSalary)}</td>
              </tr>
              <tr className="border-b border-slate-300 dark:border-slate-600">
                <td className="p-2">House Rent Allowance (HRA)</td>
                <td className="p-2 text-right">{formatIndianRupees(hra)}</td>
              </tr>
              <tr className="border-b border-slate-300 dark:border-slate-600">
                <td className="p-2">Dearness Allowance (DA)</td>
                <td className="p-2 text-right">{formatIndianRupees(da)}</td>
              </tr>
              <tr className="border-b border-slate-300 dark:border-slate-600">
                <td className="p-2">Special Allowance</td>
                <td className="p-2 text-right">{formatIndianRupees(specialAllowance)}</td>
              </tr>
              <tr className="border-b border-slate-300 dark:border-slate-600">
                <td className="p-2">Provident Fund (Employer Contribution)</td>
                <td className="p-2 text-right">{formatIndianRupees(pf)}</td>
              </tr>
              <tr className="bg-slate-50 dark:bg-slate-700 font-semibold">
                <td className="p-2">Total CTC</td>
                <td className="p-2 text-right">{formatIndianRupees(ctc)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          Your compensation will be subject to applicable taxes and statutory deductions as per the
          prevailing laws of India.
        </p>

        <p>
          We are confident that you will find this role both challenging and rewarding. We look
          forward to welcoming you to the {companyName} team on{' '}
          <strong>{formatDate(joiningDate)}</strong>.
        </p>

        <p>
          Please sign and return a copy of this letter as acceptance of this offer within 7 days of
          receipt.
        </p>

        <p>Congratulations and welcome aboard!</p>
      </div>
      {renderSignature()}

      <div className="mt-12 pt-6 border-t border-slate-300 dark:border-slate-600">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          <strong>Acceptance:</strong> I accept the above offer of employment and agree to the terms
          and conditions mentioned.
        </p>
        <div className="flex justify-between mt-8">
          <div>
            <div className="border-t border-slate-400 dark:border-slate-500 w-48 mt-8">
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Employee Signature</p>
            </div>
          </div>
          <div>
            <div className="border-t border-slate-400 dark:border-slate-500 w-48 mt-8">
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Date</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderExperienceLetter = () => (
    <div>
      {renderLetterhead()}
      {renderDateAndRef()}
      <h2 className="text-center text-lg font-bold text-slate-900 dark:text-white underline mb-6 uppercase">
        Experience Letter
      </h2>
      <div className="space-y-4 text-slate-700 dark:text-slate-300 leading-relaxed">
        <p className="font-semibold">To Whom It May Concern,</p>

        <p>
          This is to certify that <strong>{empName}</strong> (Employee ID:{' '}
          <strong>{empId}</strong>) was employed with <strong>{companyName}</strong> as a{' '}
          <strong>{designation}</strong> in the <strong>{department}</strong> department from{' '}
          <strong>{formatDate(joiningDate)}</strong> to <strong>{formatDate(letterDate)}</strong>.
        </p>

        <p>
          During the tenure of employment with our organization, we found {empName} to be a
          dedicated, sincere, and hardworking individual. {empName} has consistently demonstrated
          strong professional skills, a positive attitude, and excellent conduct throughout the
          period of employment.
        </p>

        <p>
          {empName} was responsible for carrying out duties pertaining to the role of {designation}{' '}
          and has performed all assigned responsibilities with diligence and professionalism. The
          work output was always of high quality and met the standards expected by the organization.
        </p>

        <p>
          {empName} maintained good interpersonal relationships with colleagues and management at
          all levels. There were no disciplinary issues during the tenure of employment.
        </p>

        <p>
          We wish {empName} all the very best in future endeavors and have no hesitation in
          recommending {empName} for any suitable position.
        </p>

        <p>
          This experience letter is being issued at the request of the employee for whatever
          purpose it may serve.
        </p>
      </div>
      {renderSignature()}
    </div>
  );

  const renderSalaryCertificate = () => (
    <div>
      {renderLetterhead()}
      {renderDateAndRef()}
      <h2 className="text-center text-lg font-bold text-slate-900 dark:text-white underline mb-6 uppercase">
        Salary Certificate
      </h2>
      <div className="space-y-4 text-slate-700 dark:text-slate-300 leading-relaxed">
        <p className="font-semibold">To Whom It May Concern,</p>

        <p>
          This is to certify that <strong>{empName}</strong> (Employee ID:{' '}
          <strong>{empId}</strong>) is currently employed with <strong>{companyName}</strong> as a{' '}
          <strong>{designation}</strong> in the <strong>{department}</strong> department since{' '}
          <strong>{formatDate(joiningDate)}</strong>.
        </p>

        <p>
          The details of the current compensation package of the above-named employee are as
          follows:
        </p>

        <div className="my-4">
          <table className="w-full border-collapse border border-slate-300 dark:border-slate-600 text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-700">
                <th className="p-2 text-left border-b border-slate-300 dark:border-slate-600">Particulars</th>
                <th className="p-2 text-right border-b border-slate-300 dark:border-slate-600">Amount (Per Annum)</th>
                <th className="p-2 text-right border-b border-slate-300 dark:border-slate-600">Amount (Per Month)</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-300 dark:border-slate-600">
                <td className="p-2">Basic Salary</td>
                <td className="p-2 text-right">{formatIndianRupees(basicSalary)}</td>
                <td className="p-2 text-right">{formatIndianRupees(Math.round(basicSalary / 12))}</td>
              </tr>
              <tr className="border-b border-slate-300 dark:border-slate-600">
                <td className="p-2">House Rent Allowance (HRA)</td>
                <td className="p-2 text-right">{formatIndianRupees(hra)}</td>
                <td className="p-2 text-right">{formatIndianRupees(Math.round(hra / 12))}</td>
              </tr>
              <tr className="border-b border-slate-300 dark:border-slate-600">
                <td className="p-2">Dearness Allowance (DA)</td>
                <td className="p-2 text-right">{formatIndianRupees(da)}</td>
                <td className="p-2 text-right">{formatIndianRupees(Math.round(da / 12))}</td>
              </tr>
              <tr className="border-b border-slate-300 dark:border-slate-600">
                <td className="p-2">Special Allowance</td>
                <td className="p-2 text-right">{formatIndianRupees(specialAllowance)}</td>
                <td className="p-2 text-right">{formatIndianRupees(Math.round(specialAllowance / 12))}</td>
              </tr>
              <tr className="border-b border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 font-semibold">
                <td className="p-2">Gross Salary</td>
                <td className="p-2 text-right">{formatIndianRupees(grossSalary)}</td>
                <td className="p-2 text-right">{formatIndianRupees(Math.round(grossSalary / 12))}</td>
              </tr>
              <tr className="border-b border-slate-300 dark:border-slate-600">
                <td className="p-2">Less: Provident Fund (PF)</td>
                <td className="p-2 text-right">({formatIndianRupees(pf)})</td>
                <td className="p-2 text-right">({formatIndianRupees(Math.round(pf / 12))})</td>
              </tr>
              <tr className="border-b border-slate-300 dark:border-slate-600">
                <td className="p-2">Less: Professional Tax</td>
                <td className="p-2 text-right">({formatIndianRupees(tax)})</td>
                <td className="p-2 text-right">({formatIndianRupees(Math.round(tax / 12))})</td>
              </tr>
              <tr className="bg-slate-50 dark:bg-slate-700 font-bold">
                <td className="p-2">Net Salary</td>
                <td className="p-2 text-right">{formatIndianRupees(netSalary)}</td>
                <td className="p-2 text-right">{formatIndianRupees(Math.round(netSalary / 12))}</td>
              </tr>
              <tr className="bg-slate-100 dark:bg-slate-600 font-bold">
                <td className="p-2">Cost to Company (CTC)</td>
                <td className="p-2 text-right">{formatIndianRupees(ctc)}</td>
                <td className="p-2 text-right">{formatIndianRupees(Math.round(ctc / 12))}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          This certificate is issued upon the request of <strong>{empName}</strong> for the
          purpose of whatever it may serve. This certificate does not constitute any commitment or
          guarantee of continued employment.
        </p>

        <p>
          If you require any further information or clarification, please do not hesitate to contact
          us.
        </p>
      </div>
      {renderSignature()}
    </div>
  );

  const renderRelievingLetter = () => (
    <div>
      {renderLetterhead()}
      {renderDateAndRef()}
      <h2 className="text-center text-lg font-bold text-slate-900 dark:text-white underline mb-6 uppercase">
        Relieving Letter
      </h2>
      <div className="space-y-4 text-slate-700 dark:text-slate-300 leading-relaxed">
        <p>To,</p>
        <p className="font-semibold">{empName}</p>
        <p>Employee ID: {empId}</p>

        <p>Dear {empName},</p>

        <p>
          With reference to your resignation letter, we hereby confirm that you have been relieved
          of your duties and responsibilities at <strong>{companyName}</strong> with effect from{' '}
          <strong>{formatDate(letterDate)}</strong>.
        </p>

        <p>
          You were employed with us as a <strong>{designation}</strong> in the{' '}
          <strong>{department}</strong> department from <strong>{formatDate(joiningDate)}</strong>{' '}
          to <strong>{formatDate(letterDate)}</strong>.
        </p>

        <p>
          We confirm that you have completed all necessary handover formalities and have returned all
          company property, including but not limited to laptops, access cards, documents, and any
          other assets belonging to the organization.
        </p>

        <p>
          As of the date of this letter, you have no outstanding dues or liabilities towards{' '}
          <strong>{companyName}</strong>. All pending settlements including full and final settlement
          of salary, reimbursements, and any other dues have been processed or will be processed as
          per company policy.
        </p>

        <p>
          We confirm that there are no dues pending from your end and you stand relieved from the
          services of the company.
        </p>

        <p>
          We appreciate your contributions during your tenure with us and wish you all the very best
          in your future endeavors.
        </p>
      </div>
      {renderSignature()}
    </div>
  );

  const renderAppraisalLetter = () => (
    <div>
      {renderLetterhead()}
      {renderDateAndRef()}
      <h2 className="text-center text-lg font-bold text-slate-900 dark:text-white underline mb-6 uppercase">
        Appraisal Letter
      </h2>
      <div className="space-y-4 text-slate-700 dark:text-slate-300 leading-relaxed">
        <p className="font-semibold">Confidential</p>

        <p>To,</p>
        <p className="font-semibold">{empName}</p>
        <p>Employee ID: {empId}</p>
        <p>Designation: {designation}</p>
        <p>Department: {department}</p>

        <p>Dear {empName},</p>

        <p>
          We are pleased to inform you that based on your performance evaluation and contributions
          to the organization, the management has decided to revise your compensation with effect
          from <strong>{formatDate(letterDate)}</strong>.
        </p>

        <p>
          Your dedication, consistent efforts, and commitment to delivering quality work have been
          recognized and appreciated by the management.
        </p>

        <div className="my-4">
          <table className="w-full border-collapse border border-slate-300 dark:border-slate-600 text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-700">
                <th className="p-2 text-left border-b border-slate-300 dark:border-slate-600">Particulars</th>
                <th className="p-2 text-right border-b border-slate-300 dark:border-slate-600">Previous</th>
                <th className="p-2 text-right border-b border-slate-300 dark:border-slate-600">Revised</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-300 dark:border-slate-600">
                <td className="p-2">Gross Salary (Per Annum)</td>
                <td className="p-2 text-right">{formatIndianRupees(grossSalary)}</td>
                <td className="p-2 text-right">{newSalary ? formatIndianRupees(newSalary) : 'As per revised structure'}</td>
              </tr>
              <tr className="border-b border-slate-300 dark:border-slate-600 font-semibold">
                <td className="p-2">Cost to Company (CTC) (Per Annum)</td>
                <td className="p-2 text-right">{formatIndianRupees(ctc)}</td>
                <td className="p-2 text-right">{newCtc ? formatIndianRupees(newCtc) : 'As per revised structure'}</td>
              </tr>
              {(newSalary || newCtc) && (
                <tr className="bg-green-50 dark:bg-green-900/30 font-bold text-green-700 dark:text-green-400">
                  <td className="p-2">Increment</td>
                  <td className="p-2 text-right" colSpan={2}>
                    {newCtc
                      ? `${formatIndianRupees(newCtc - ctc)} (${(((newCtc - ctc) / ctc) * 100).toFixed(1)}%)`
                      : newSalary
                      ? `${formatIndianRupees(newSalary - grossSalary)} (${(((newSalary - grossSalary) / grossSalary) * 100).toFixed(1)}%)`
                      : 'N/A'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p>
          The revised compensation is effective from <strong>{formatDate(letterDate)}</strong>.
          The detailed salary breakup will be shared with you separately by the HR department.
        </p>

        <p>
          This revision is a recognition of your hard work and performance. We expect you to
          continue to contribute with the same dedication and enthusiasm to achieve the
          organization&apos;s goals.
        </p>

        <p>
          Please note that this letter and its contents are confidential and should not be shared
          with anyone within or outside the organization.
        </p>

        <p>Congratulations on your well-deserved appraisal!</p>
      </div>
      {renderSignature()}
    </div>
  );

  const renderWarningLetter = () => (
    <div>
      {renderLetterhead()}
      {renderDateAndRef()}
      <h2 className="text-center text-lg font-bold text-slate-900 dark:text-white underline mb-6 uppercase">
        Warning Letter
      </h2>
      <div className="space-y-4 text-slate-700 dark:text-slate-300 leading-relaxed">
        <p>To,</p>
        <p className="font-semibold">{empName}</p>
        <p>Employee ID: {empId}</p>
        <p>Designation: {designation}</p>
        <p>Department: {department}</p>

        <p>Dear {empName},</p>

        <p>
          <strong>Subject: Warning Letter</strong>
        </p>

        <p>
          This letter serves as a formal written warning regarding your conduct/performance as
          detailed below. It has been brought to the notice of the management that:
        </p>

        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 my-4">
          <p className="text-red-800 dark:text-red-300 whitespace-pre-wrap">
            {warningReason || 'Reason for warning will be specified here.'}
          </p>
        </div>

        <p>
          The above-mentioned behavior/conduct is in violation of the company&apos;s policies and
          code of conduct and is considered unacceptable by the management.
        </p>

        <p>
          You are hereby warned that such behavior/conduct will not be tolerated. This letter serves
          as a formal warning, and a copy of this letter will be placed in your personnel file.
        </p>

        <p className="font-semibold">Consequences of continued violation:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Further disciplinary action, up to and including suspension without pay.</li>
          <li>Termination of employment with immediate effect.</li>
          <li>Forfeiture of any performance bonuses or incentives for the current period.</li>
          <li>Legal action if the conduct warrants such measures.</li>
        </ul>

        <p>
          You are expected to immediately rectify your behavior and ensure full compliance with the
          company&apos;s policies, rules, and regulations. You are advised to take this warning
          seriously and make the necessary improvements within the next 30 days.
        </p>

        <p>
          Should you have any concerns or wish to discuss this matter, you may request a meeting
          with the HR department within 7 days of receipt of this letter.
        </p>

        <p>
          We trust that you will take this matter seriously and ensure that such incidents do not
          recur in the future.
        </p>
      </div>
      {renderSignature()}

      <div className="mt-12 pt-6 border-t border-slate-300 dark:border-slate-600">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          <strong>Acknowledgement:</strong> I acknowledge receipt of this warning letter and
          understand the contents mentioned above.
        </p>
        <div className="flex justify-between mt-8">
          <div>
            <div className="border-t border-slate-400 dark:border-slate-500 w-48 mt-8">
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Employee Signature</p>
            </div>
          </div>
          <div>
            <div className="border-t border-slate-400 dark:border-slate-500 w-48 mt-8">
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Date</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const templates = {
    offer: renderOfferLetter,
    experience: renderExperienceLetter,
    salary: renderSalaryCertificate,
    relieving: renderRelievingLetter,
    appraisal: renderAppraisalLetter,
    warning: renderWarningLetter,
  };

  return templates[type] ? templates[type]() : null;
}

export default function LetterGeneration() {
  const { isAdmin } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [templates, setTemplates] = useState(letterTemplates);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [letterDate, setLetterDate] = useState(new Date().toISOString().split('T')[0]);
  const [warningReason, setWarningReason] = useState('');
  const [employeeData, setEmployeeData] = useState(null);
  const [refNumber, setRefNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    loadEmployees();
    loadTemplates();
  }, []);

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const res = await api.get('/letters/employees');
      setEmployees(res.data || []);
    } catch (err) {
      toast.error('Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const res = await api.get('/letters/templates');
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        setTemplates(res.data);
      }
    } catch {
      // Use default templates defined above
    }
  };

  const handleGenerate = async () => {
    if (!selectedEmployee) {
      toast.error('Please select an employee');
      return;
    }
    if (!selectedTemplate) {
      toast.error('Please select a letter template');
      return;
    }

    setGenerating(true);
    try {
      const res = await api.get(`/letters/employee-data/${selectedEmployee}`);
      setEmployeeData(res.data);
      setRefNumber(generateRefNumber(selectedTemplate));
      setShowPreview(true);
      toast.success('Letter generated successfully!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load employee data');
    } finally {
      setGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400 text-lg">
            You do not have permission to access this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-slide-up">
      {/* Print-only styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #letter-preview, #letter-preview * {
            visibility: visible;
          }
          #letter-preview {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 40px;
            background: white !important;
            color: black !important;
          }
          #letter-preview * {
            color: black !important;
            background: white !important;
          }
          #letter-preview table {
            border-color: #333 !important;
          }
          #letter-preview th, #letter-preview td {
            border-color: #333 !important;
          }
          #letter-preview .bg-slate-50, #letter-preview .dark\\:bg-slate-700 {
            background: #f5f5f5 !important;
          }
          #letter-preview .bg-red-50, #letter-preview .dark\\:bg-red-900\\/20 {
            background: #fff5f5 !important;
            border-color: #cc0000 !important;
          }
          #letter-preview .bg-green-50, #letter-preview .dark\\:bg-green-900\\/30 {
            background: #f0fff0 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Page Header */}
      <div className="page-header no-print">
        <div className="flex items-center gap-3">
          <FileText className="w-7 h-7 text-blue-600 dark:text-blue-400" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Letter Generation</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              Generate formal letters for employees
            </p>
          </div>
        </div>
      </div>

      {/* Controls Section */}
      <div className="card no-print mt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Employee Dropdown */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Select Employee
            </label>
            <select
              className="input w-full"
              value={selectedEmployee}
              onChange={(e) => {
                setSelectedEmployee(e.target.value);
                setShowPreview(false);
              }}
              disabled={loading}
            >
              <option value="">-- Select Employee --</option>
              {employees.map((emp) => (
                <option key={emp.id || emp._id} value={emp.id || emp._id}>
                  {emp.name} {emp.employee_id ? `(${emp.employee_id})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Template Dropdown */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Letter Template
            </label>
            <select
              className="input w-full"
              value={selectedTemplate}
              onChange={(e) => {
                setSelectedTemplate(e.target.value);
                setShowPreview(false);
              }}
            >
              <option value="">-- Select Template --</option>
              {templates.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date Input */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Letter Date
            </label>
            <input
              type="date"
              className="input w-full"
              value={letterDate}
              onChange={(e) => setLetterDate(e.target.value)}
            />
          </div>

          {/* Generate Button */}
          <div className="flex items-end">
            <button
              className="btn-primary w-full flex items-center justify-center gap-2"
              onClick={handleGenerate}
              disabled={generating || !selectedEmployee || !selectedTemplate}
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Generate Letter
                </>
              )}
            </button>
          </div>
        </div>

        {/* Warning Reason Textarea */}
        {selectedTemplate === 'warning' && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Reason for Warning
            </label>
            <textarea
              className="input w-full"
              rows={4}
              placeholder="Enter the detailed reason for issuing this warning letter..."
              value={warningReason}
              onChange={(e) => setWarningReason(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* Letter Preview */}
      {showPreview && employeeData && (
        <div className="mt-6 animate-slide-up">
          {/* Print Button */}
          <div className="flex justify-end mb-4 no-print">
            <button
              className="btn-secondary flex items-center gap-2"
              onClick={handlePrint}
            >
              <Printer className="w-4 h-4" />
              Print Letter
            </button>
          </div>

          {/* Letter Card */}
          <div
            id="letter-preview"
            className="card bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-slate-700 max-w-4xl mx-auto"
            style={{ padding: '3rem', fontFamily: "'Times New Roman', 'Georgia', serif" }}
          >
            <LetterPreview
              type={selectedTemplate}
              data={employeeData}
              letterDate={letterDate}
              warningReason={warningReason}
              refNumber={refNumber}
            />
          </div>
        </div>
      )}

      {/* Empty State */}
      {!showPreview && (
        <div className="card mt-6 text-center py-16 no-print">
          <FileText className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-500 dark:text-slate-400">
            No Letter Generated Yet
          </h3>
          <p className="text-slate-400 dark:text-slate-500 text-sm mt-2">
            Select an employee and a letter template, then click &quot;Generate Letter&quot; to preview.
          </p>
        </div>
      )}
    </div>
  );
}
