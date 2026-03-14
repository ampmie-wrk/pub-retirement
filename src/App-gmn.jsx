import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  ComposedChart, ReferenceLine, LabelList 
} from 'recharts';
import { 
  Calculator, TrendingUp, Wallet, Clock, AlertCircle, Banknote, Landmark, 
  CheckCircle, XCircle, FileText, Download, Printer 
} from 'lucide-react';

// --- Helper Component: Number Input with Comma ---
const NumberInput = ({ value, onChange, className, ...props }) => {
  const [isFocused, setIsFocused] = useState(false);

  const formatDisplay = (val) => {
    if (val === '' || val === null || val === undefined || isNaN(val)) return '';
    // เพิ่ม maximumFractionDigits ให้รองรับทศนิยมลึกขึ้น (สูงสุด 4 ตำแหน่ง) สำหรับกรณีผลตอบแทน/เงินเฟ้อ
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 }).format(val);
  };

  const handleChange = (e) => {
    const raw = e.target.value.replace(/,/g, '');
    // ตรวจสอบว่าเป็นตัวเลข (รวมทศนิยม) หรือไม่
    if (raw === '' || /^-?\d*\.?\d*$/.test(raw)) {
      // ส่งค่า raw กลับไปเป็น String แทน parseFloat เพื่อให้ผู้ใช้สามารถพิมพ์จุดทศนิยม (".") ได้โดยไม่ถูกตัดทิ้ง
      onChange(raw); 
    }
  };

  return (
    <input
      type="text"
      value={isFocused ? value : formatDisplay(value)}
      onChange={handleChange}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      className={className}
      {...props}
    />
  );
};

// --- Helper Component: Quick Select Buttons ---
const QuickSelect = ({ options, onSelect }) => (
  <div className="flex flex-wrap gap-1.5 mt-2">
    {options.map(val => (
      <button
        key={val}
        type="button"
        onClick={() => onSelect(val)}
        className="text-[10px] px-2 py-1 bg-emerald-50 text-emerald-700 font-medium rounded border border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 transition"
      >
        {val === 0 ? '0' : new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(val)}
      </button>
    ))}
  </div>
);

const RetirementPlanner = () => {
  // --- State for Inputs ---
  const [inputs, setInputs] = useState({
    currentAge: 30,
    retireAge: 60,
    lifeExpectancy: 85,
    expenseAmount: 20000,
    expenseFrequency: 'monthly',
    currentAssets: 500000,
    annualInvestAmount: 120000,
    preRetireReturn: 6,
    postRetireReturn: 4,
    inflation: 3,
  });

  // --- Calculations ---
  const results = useMemo(() => {
    // 0. Parse safely to prevent NaN crashes
    const currentAge = parseFloat(inputs.currentAge) || 0;
    const retireAge = parseFloat(inputs.retireAge) || 0;
    const lifeExpectancy = parseFloat(inputs.lifeExpectancy) || 0;
    const expenseAmount = parseFloat(inputs.expenseAmount) || 0;
    const currentAssets = parseFloat(inputs.currentAssets) || 0;
    const annualInvestAmount = parseFloat(inputs.annualInvestAmount) || 0;
    const preRetireReturn = parseFloat(inputs.preRetireReturn) || 0;
    const postRetireReturn = parseFloat(inputs.postRetireReturn) || 0;
    const inflation = parseFloat(inputs.inflation) || 0;
    const expenseFrequency = inputs.expenseFrequency;

    // Basic Validations
    if (currentAge >= retireAge || retireAge >= lifeExpectancy || currentAge <= 0) {
      return null;
    }

    const yearsToInvest = retireAge - currentAge;
    // +1 because loop is inclusive from retireAge to lifeExpectancy
    const yearsInRetirement = lifeExpectancy - retireAge + 1; 
    
    // 1. Calculate Expenses at Retirement
    const annualExpenseCurrent = expenseFrequency === 'monthly' ? expenseAmount * 12 : expenseAmount;
    const expenseAtRetirement = annualExpenseCurrent * Math.pow(1 + inflation / 100, yearsToInvest);

    // 2. Calculate Total Nest Egg Needed (Target)
    const realReturnPost = (1 + postRetireReturn / 100) / (1 + inflation / 100) - 1;
    let requiredNestEgg = 0;
    if (realReturnPost === 0) {
        requiredNestEgg = expenseAtRetirement * yearsInRetirement;
    } else {
        // PV of Annuity Due
        requiredNestEgg = expenseAtRetirement * ((1 - Math.pow(1 + realReturnPost, -yearsInRetirement)) / realReturnPost) * (1 + realReturnPost);
    }

    // 3. Simulation & Chart Data Generation
    const chartData = [];
    let balancePrincipalExisting = currentAssets;
    let balancePrincipalNew = 0;
    let balanceInterestExisting = 0;
    let balanceInterestNew = 0;
    let isSufficient = true;
    let moneyRunOutAge = null;
    let projectedNestEgg = 0;

    for (let age = currentAge; age <= lifeExpectancy; age++) {
        const isRetired = age >= retireAge;
        const yearIndex = age - currentAge + 1;
        
        // Capture Projected Nest Egg at the exact moment of retirement (before withdrawal)
        if (age === retireAge) {
            projectedNestEgg = balancePrincipalExisting + balancePrincipalNew + balanceInterestExisting + balanceInterestNew;
        }

        // --- Withdrawal Phase ---
        let withdrawAmount = 0;
        let withdrawalDisplay = 0;

        if (isRetired) {
            const currentInflationYear = age - retireAge;
            withdrawAmount = annualExpenseCurrent * Math.pow(1 + inflation/100, yearsToInvest + currentInflationYear);
            withdrawalDisplay = withdrawAmount;

            const totalAssets = balancePrincipalExisting + balancePrincipalNew + balanceInterestExisting + balanceInterestNew;
            
            // Check if money runs out
            if (totalAssets < withdrawAmount && isSufficient) {
                isSufficient = false;
                moneyRunOutAge = age;
            }

            let remainingWithdrawal = withdrawAmount;

            // Deduct logic: InterestNew -> InterestExisting -> New Principal -> Existing Principal
            if (balanceInterestNew >= remainingWithdrawal) {
                balanceInterestNew -= remainingWithdrawal;
                remainingWithdrawal = 0;
            } else {
                remainingWithdrawal -= balanceInterestNew;
                balanceInterestNew = 0;
            }

            if (remainingWithdrawal > 0) {
                if (balanceInterestExisting >= remainingWithdrawal) {
                    balanceInterestExisting -= remainingWithdrawal;
                    remainingWithdrawal = 0;
                } else {
                    remainingWithdrawal -= balanceInterestExisting;
                    balanceInterestExisting = 0;
                }
            }

            if (remainingWithdrawal > 0) {
                if (balancePrincipalNew >= remainingWithdrawal) {
                    balancePrincipalNew -= remainingWithdrawal;
                    remainingWithdrawal = 0;
                } else {
                    remainingWithdrawal -= balancePrincipalNew;
                    balancePrincipalNew = 0;
                }
            }

            if (remainingWithdrawal > 0) {
                 balancePrincipalExisting -= remainingWithdrawal;
                 if (balancePrincipalExisting < 0) balancePrincipalExisting = 0;
            }
        }

        // --- Accumulation Phase (Add Savings at beginning of year, starting Year 2) ---
        let yearlyInvest = 0;
        if (!isRetired && yearIndex > 1) {
             yearlyInvest = annualInvestAmount;
             balancePrincipalNew += yearlyInvest;
        }

        // --- Growth Phase (Calculated for current year) ---
        const currentRate = isRetired ? postRetireReturn : preRetireReturn;
        const rate = currentRate / 100;
        
        const yearlyReturnOnExistingPrincipal = balancePrincipalExisting * rate;
        const yearlyReturnOnExistingInterest = balanceInterestExisting * rate;
        const yearlyReturnNew = (balancePrincipalNew + balanceInterestNew) * rate;

        balanceInterestExisting += yearlyReturnOnExistingPrincipal + yearlyReturnOnExistingInterest;
        balanceInterestNew += yearlyReturnNew;

        // --- Snapshot for Chart & CSV ---
        let total = Math.round(balancePrincipalExisting + balancePrincipalNew + balanceInterestExisting + balanceInterestNew);
        
        let displayData = {
            age,
            yearIndex,
            total: total,
            existingAssets: Math.round(balancePrincipalExisting),
            newSavings: Math.round(balancePrincipalNew),
            interestExisting: Math.round(balanceInterestExisting),
            interestNew: Math.round(balanceInterestNew),
            interest: Math.round(balanceInterestExisting + balanceInterestNew), 
            
            // CSV Details
            yearlyReturnOnExistingPrincipal: Math.round(yearlyReturnOnExistingPrincipal),
            yearlyReturnOnExistingInterest: Math.round(yearlyReturnOnExistingInterest),
            yearlyReturnNew: Math.round(yearlyReturnNew),
            yearlyInvest: Math.round(yearlyInvest),
            
            withdrawal: isRetired ? -Math.round(withdrawalDisplay) : 0,
            marker: age === retireAge ? "🏖️" : (age === lifeExpectancy ? "🏁" : null) // Using null instead of "" for safety
        };
        chartData.push(displayData);
    }

    // 4. Calculate Gap
    const r = preRetireReturn / 100;
    const gap = requiredNestEgg - projectedNestEgg;

    // 5. Suggestions
    // Always initialize suggestions to prevent .toFixed crashes later!
    let suggestions = {
        addLumpSum: 0,
        addAnnualSavings: 0,
        maxMonthlyExpense: 0,
        neededReturn: preRetireReturn
    };

    if (gap > 0 || !isSufficient) {
        // Only run complex reverse calculations if there is a gap mathematically
        if (gap > 0) {
            // Option 1: Lump Sum
            const additionalLumpSum = gap / Math.pow(1 + preRetireReturn / 100, yearsToInvest);
            
            // Option 2: Annual Savings (Investing starts Year 2, so n = yearsToInvest - 1)
            let additionalAnnualSavings = 0;
            let nInvestments = yearsToInvest - 1;
            
            if (nInvestments > 0) {
                if (r === 0) {
                    additionalAnnualSavings = gap / nInvestments;
                } else {
                    let fvFactor = ((Math.pow(1 + r, nInvestments) - 1) / r) * (1 + r);
                    additionalAnnualSavings = gap / fvFactor;
                }
            } else {
                additionalAnnualSavings = gap;
            }

            // Option 3: Reduce Expenses
            let factor = 0;
            if (realReturnPost === 0) {
                factor = yearsInRetirement;
            } else {
                factor = ((1 - Math.pow(1 + realReturnPost, -yearsInRetirement)) / realReturnPost) * (1 + realReturnPost);
            }
            const maxAffordableExpenseAtRetirement = projectedNestEgg / factor;
            const maxAffordableExpenseCurrent = maxAffordableExpenseAtRetirement / Math.pow(1 + inflation / 100, yearsToInvest);
            const monthlyAffordable = maxAffordableExpenseCurrent / 12;

            // Option 4: Required Return (Iterative)
            let low = 0, high = 1.0; 
            let neededReturn = preRetireReturn;
            for(let i=0; i<50; i++) {
                let mid = (low + high) / 2;
                let testNestEgg = currentAssets * Math.pow(1 + mid, yearsToInvest);
                if (nInvestments > 0) {
                     if (mid === 0) testNestEgg += annualInvestAmount * nInvestments;
                     else testNestEgg += annualInvestAmount * ((Math.pow(1 + mid, nInvestments) - 1) / mid) * (1 + mid);
                }
                if (testNestEgg < requiredNestEgg) low = mid;
                else high = mid;
            }
            neededReturn = (low + high) / 2 * 100;

            suggestions = {
                addLumpSum: additionalLumpSum,
                addAnnualSavings: additionalAnnualSavings,
                maxMonthlyExpense: monthlyAffordable,
                neededReturn: neededReturn
            };
        }
    }

    return {
        requiredNestEgg,
        projectedNestEgg,
        gap,
        isSufficient,
        moneyRunOutAge,
        chartData,
        suggestions
    };
  }, [inputs]);

  // --- Handlers ---
  const handleInputChange = (name, value) => {
    setInputs(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFrequencyChange = (newFreq) => {
    if (newFreq === inputs.expenseFrequency) return;
    
    const multiplier = newFreq === 'yearly' ? 12 : 1/12;
    const newAmount = Math.round(parseFloat(inputs.expenseAmount || 0) * multiplier);

    setInputs(prev => ({ 
        ...prev, 
        expenseFrequency: newFreq,
        expenseAmount: newAmount
    }));
  };

  // --- Export Functions ---
  const handleExportCSV = () => {
    if (!results) return;

    const BOM = "\uFEFF";
    
    let csvContent = BOM + "Parameter,Value\n";
    csvContent += `Current Age,${inputs.currentAge || 0}\n`;
    csvContent += `Retirement Age,${inputs.retireAge || 0}\n`;
    csvContent += `Life Expectancy,${inputs.lifeExpectancy || 0}\n`;
    csvContent += `Expenses (${inputs.expenseFrequency}),${inputs.expenseAmount || 0}\n`;
    csvContent += `Current Assets,${inputs.currentAssets || 0}\n`;
    csvContent += `Annual Investment,${inputs.annualInvestAmount || 0}\n`;
    csvContent += `Pre-Retire Return %,${inputs.preRetireReturn || 0}\n`;
    csvContent += `Post-Retire Return %,${inputs.postRetireReturn || 0}\n`;
    csvContent += `Inflation %,${inputs.inflation || 0}\n`;
    csvContent += `\n`; 

    csvContent += "อายุ,ปีที่,เงินต้นที่ลงทุนก้อนแรก,ผลตอบแทนจากการลงทุนของเงินต้นแต่ละปี,ผลตอบแทนทบต้นจากกำไรสะสมแต่ละปี,เงินลงทุนเพิ่มแต่ละปี,ยอดสะสมของเงินลงทุนเพิ่ม,ผลตอบแทนจากเงินลงทุนเพิ่มแต่ละปี,เงินที่ถอนออกไปใช้แต่ละปี,ยอดสินทรัพย์สุทธิ\n";
    results.chartData.forEach(row => {
        csvContent += `${row.age},${row.yearIndex},${row.existingAssets},${row.yearlyReturnOnExistingPrincipal},${row.yearlyReturnOnExistingInterest},${row.yearlyInvest},${row.newSavings},${row.yearlyReturnNew},${Math.abs(row.withdrawal)},${row.total}\n`;
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "retirement_plan_data.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintPDF = () => {
    window.print();
  };

  // --- Formatters ---
  const formatMoney = (amount) => {
    if (amount === undefined || amount === null || isNaN(amount)) return '฿0';
    return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(Math.abs(amount));
  };
  const formatNumber = (num) => {
    if (num === undefined || num === null || isNaN(num)) return '0';
    return new Intl.NumberFormat('th-TH', { maximumFractionDigits: 0 }).format(num);
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans print:bg-white">
      <style>{`
        @media print {
            @page { margin: 10mm; size: landscape; }
            body { -webkit-print-color-adjust: exact; }
            .no-print { display: none !important; }
            .print-full-width { width: 100% !important; max-width: none !important; height: auto !important; overflow: visible !important; }
            .print-container { box-shadow: none !important; margin: 0 !important; padding: 0 !important; }
            .print-break-inside { break-inside: avoid; }
        }
      `}</style>

      <div className="max-w-7xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden print-container print-full-width">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 md:p-8 flex items-center justify-between print:bg-slate-900 print:text-white">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
              <Calculator className="w-8 h-8 text-emerald-400" />
              จำลองแผนเกษียณอายุ
            </h1>
            <p className="text-slate-400 mt-2">ประเมินความพอเพียงของเงินออม และค้นหาทางออกที่ดีที่สุด</p>
          </div>
          <div className="flex gap-2 no-print">
            <button 
                onClick={handleExportCSV}
                className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition"
            >
                <Download className="w-4 h-4" /> Export CSV
            </button>
            <button 
                onClick={handlePrintPDF}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-semibold transition"
            >
                <Printer className="w-4 h-4" /> พิมพ์ / PDF
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row print:flex-col">
          
          {/* Left Panel: Inputs */}
          <div className="w-full lg:w-1/3 p-6 md:p-8 bg-gray-50 border-r border-gray-100 h-auto lg:h-screen lg:overflow-y-auto no-print">
            <h2 className="text-lg font-semibold text-slate-800 mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              ตั้งค่าสมมติฐาน
            </h2>

            <div className="space-y-5">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-medium text-gray-500 mb-1">อายุปัจจุบัน</label>
                  <NumberInput name="currentAge" value={inputs.currentAge} onChange={(val) => handleInputChange('currentAge', val)} 
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 transition" />
                </div>
                <div className="col-span-1">
                   <label className="block text-xs font-medium text-gray-500 mb-1">อายุเกษียณ</label>
                   <NumberInput name="retireAge" value={inputs.retireAge} onChange={(val) => handleInputChange('retireAge', val)} 
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 transition" />
                </div>
                <div className="col-span-1">
                   <label className="block text-xs font-medium text-gray-500 mb-1">อายุขัย</label>
                   <NumberInput name="lifeExpectancy" value={inputs.lifeExpectancy} onChange={(val) => handleInputChange('lifeExpectancy', val)} 
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 transition" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ค่าใช้จ่ายหลังเกษียณ (ณ ปัจจุบัน)</label>
                <div className="flex gap-2 mb-2">
                    <button 
                        onClick={() => handleFrequencyChange('monthly')}
                        className={`flex-1 py-1 text-xs rounded-md border ${inputs.expenseFrequency === 'monthly' ? 'bg-emerald-100 border-emerald-500 text-emerald-800 font-bold' : 'bg-white border-gray-300 text-gray-600'}`}
                    >ต่อเดือน</button>
                    <button 
                        onClick={() => handleFrequencyChange('yearly')}
                        className={`flex-1 py-1 text-xs rounded-md border ${inputs.expenseFrequency === 'yearly' ? 'bg-emerald-100 border-emerald-500 text-emerald-800 font-bold' : 'bg-white border-gray-300 text-gray-600'}`}
                    >ต่อปี</button>
                </div>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500">฿</span>
                    </div>
                    <NumberInput name="expenseAmount" value={inputs.expenseAmount} onChange={(val) => handleInputChange('expenseAmount', val)} 
                        className="w-full pl-8 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500" />
                </div>
                <QuickSelect 
                    options={inputs.expenseFrequency === 'monthly' ? [20000, 30000, 50000] : [240000, 360000, 600000]} 
                    onSelect={(val) => handleInputChange('expenseAmount', val)} 
                />
              </div>

              <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                  <h3 className="text-sm font-semibold text-slate-700 mb-3 border-b pb-2">แผนการลงทุน</h3>
                  <div className="mb-3">
                    <label className="block text-xs font-medium text-gray-500 mb-1">เงินต้นที่มีอยู่แล้ว (บาท)</label>
                    <NumberInput name="currentAssets" value={inputs.currentAssets} onChange={(val) => handleInputChange('currentAssets', val)} 
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-gray-50" />
                    <QuickSelect 
                        options={[0, 500000, 1000000, 2000000, 3000000, 5000000]} 
                        onSelect={(val) => handleInputChange('currentAssets', val)} 
                    />
                  </div>
                  <div className="mt-4">
                    <label className="block text-xs font-medium text-emerald-700 mb-1">ลงทุนเพิ่มปีละ (บาท)</label>
                    <NumberInput name="annualInvestAmount" value={inputs.annualInvestAmount} onChange={(val) => handleInputChange('annualInvestAmount', val)} 
                        className="w-full p-2 border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-emerald-50 font-semibold text-emerald-900" />
                    <QuickSelect 
                        options={[60000, 120000, 240000, 360000, 500000, 800000]} 
                        onSelect={(val) => handleInputChange('annualInvestAmount', val)} 
                    />
                    <p className="text-[10px] text-gray-400 mt-2 text-right">เฉลี่ยเดือนละ {formatNumber((parseFloat(inputs.annualInvestAmount) || 0)/12)} บาท</p>
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">ผลตอบแทนก่อนเกษียณ (%)</label>
                    <NumberInput name="preRetireReturn" value={inputs.preRetireReturn} onChange={(val) => handleInputChange('preRetireReturn', val)} 
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500" />
                 </div>
                 <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">ผลตอบแทนหลังเกษียณ (%)</label>
                    <NumberInput name="postRetireReturn" value={inputs.postRetireReturn} onChange={(val) => handleInputChange('postRetireReturn', val)} 
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500" />
                 </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">อัตราเงินเฟ้อคาดการณ์ (%)</label>
                <NumberInput name="inflation" value={inputs.inflation} onChange={(val) => handleInputChange('inflation', val)} 
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500" />
              </div>
            </div>
          </div>

          {/* Right Panel: Results & Chart */}
          <div className="w-full lg:w-2/3 p-6 md:p-8 bg-white h-auto lg:h-screen lg:overflow-y-auto print-full-width">
            
            <div className="hidden print:block mb-6 p-4 border rounded-lg bg-gray-50">
                <h2 className="text-lg font-bold mb-2">ข้อมูลสมมติฐาน:</h2>
                <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>อายุ: {inputs.currentAge || 0} - {inputs.retireAge || 0} - {inputs.lifeExpectancy || 0} ปี</div>
                    <div>เงินต้น: {formatMoney(inputs.currentAssets)}</div>
                    <div>ลงทุนเพิ่ม: {formatMoney(inputs.annualInvestAmount)}/ปี</div>
                    <div>ค่าใช้จ่ายหลังเกษียณ: {formatMoney(inputs.expenseAmount)} ({inputs.expenseFrequency === 'monthly' ? 'ต่อเดือน' : 'ต่อปี'})</div>
                    <div>ผลตอบแทน: {inputs.preRetireReturn || 0}% / {inputs.postRetireReturn || 0}%</div>
                    <div>เงินเฟ้อ: {inputs.inflation || 0}%</div>
                </div>
            </div>

            {!results ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                    <AlertCircle className="w-12 h-12 mb-2" />
                    <p>กรุณาตรวจสอบอายุที่กรอก (อายุเกษียณต้องมากกว่าอายุปัจจุบันและมากกว่า 0)</p>
                </div>
            ) : (
                <>
                <div className={`rounded-2xl p-6 text-white shadow-lg mb-8 print-break-inside ${results.isSufficient ? 'bg-gradient-to-r from-emerald-600 to-teal-600' : 'bg-gradient-to-r from-rose-500 to-red-600'}`}>
                     <div className="flex items-start justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                {results.isSufficient ? <CheckCircle className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
                                <h2 className="text-2xl font-bold">
                                    {results.isSufficient ? "ยินดีด้วย! เงินพอใช้จนถึงสิ้นอายุขัย" : "เงินไม่พอใช้จนถึงสิ้นอายุขัย"}
                                </h2>
                            </div>
                            <p className="opacity-90">
                                {results.isSufficient 
                                    ? `คุณจะมีเงินเหลือประมาณ ${formatMoney(results.chartData[results.chartData.length-1]?.total || 0)} ณ อายุ ${inputs.lifeExpectancy || 0} ปี` 
                                    : `เงินของคุณจะหมดลงเมื่ออายุประมาณ ${results.moneyRunOutAge || '-'} ปี (ขาดทุนทรัพย์รวมประมาณ ${formatMoney(results.gap)} ณ วันเกษียณ)`}
                            </p>
                        </div>
                        <div className="text-right hidden md:block">
                            <p className="text-sm opacity-75">มูลค่าสินทรัพย์ ณ วันเกษียณ</p>
                            <p className="text-3xl font-bold">{formatMoney(results.projectedNestEgg)}</p>
                            <p className="text-xs opacity-75 mt-1">เป้าหมายที่ควรมี: {formatMoney(results.requiredNestEgg)}</p>
                        </div>
                     </div>
                </div>

                {!results.isSufficient && (
                    <div className="mb-8 print-break-inside">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-rose-500" />
                            คำแนะนำ: เลือกปรับแผนได้ 4 ทางเลือก
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl print:border-gray-300">
                                <div className="text-sm text-gray-500 mb-1">1. เพิ่มเงินลงทุนก้อนแรก</div>
                                <div className="flex items-end gap-2">
                                    <span className="text-2xl font-bold text-blue-700">{formatMoney(results.suggestions?.addLumpSum || 0)}</span>
                                    <span className="text-xs text-blue-600 mb-1.5">(เพิ่มทันที)</span>
                                </div>
                                <p className="text-xs text-gray-500 mt-2">จากเดิม {formatNumber(inputs.currentAssets)} เป็น {formatNumber((parseFloat(inputs.currentAssets) || 0) + (results.suggestions?.addLumpSum || 0))}</p>
                            </div>

                            <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl print:border-gray-300">
                                <div className="text-sm text-gray-500 mb-1">2. ลงทุนเพิ่มในแต่ละปี</div>
                                <div className="flex items-end gap-2">
                                    <span className="text-2xl font-bold text-emerald-700">{formatMoney((parseFloat(inputs.annualInvestAmount) || 0) + (results.suggestions?.addAnnualSavings || 0))}</span>
                                    <span className="text-xs text-emerald-600 mb-1.5">/ ปี</span>
                                </div>
                                <p className="text-xs text-gray-500 mt-2">เพิ่มขึ้นปีละ {formatMoney(results.suggestions?.addAnnualSavings || 0)}</p>
                            </div>

                            <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl print:border-gray-300">
                                <div className="text-sm text-gray-500 mb-1">3. ลดค่าใช้จ่ายหลังเกษียณ</div>
                                <div className="flex items-end gap-2">
                                    <span className="text-2xl font-bold text-amber-700">{formatMoney(results.suggestions?.maxMonthlyExpense || 0)}</span>
                                    <span className="text-xs text-amber-600 mb-1.5">/ เดือน</span>
                                </div>
                                <p className="text-xs text-gray-500 mt-2">ลดลงจาก {formatMoney(inputs.expenseFrequency === 'monthly' ? inputs.expenseAmount : (parseFloat(inputs.expenseAmount) || 0)/12)}</p>
                            </div>

                             <div className="bg-purple-50 border border-purple-100 p-4 rounded-xl print:border-gray-300">
                                <div className="text-sm text-gray-500 mb-1">4. เพิ่มผลตอบแทนก่อนเกษียณ</div>
                                <div className="flex items-end gap-2">
                                    <span className="text-2xl font-bold text-purple-700">{(results.suggestions?.neededReturn || parseFloat(inputs.preRetireReturn) || 0).toFixed(2)}%</span>
                                    <span className="text-xs text-purple-600 mb-1.5">/ ปี</span>
                                </div>
                                <p className="text-xs text-gray-500 mt-2">เพิ่มขึ้นจากเดิม {parseFloat(inputs.preRetireReturn) || 0}%</p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="print-break-inside">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-emerald-600" />
                        เส้นทางความมั่งคั่ง (Wealth Path)
                    </h3>
                    <div className="h-[400px] w-full border border-gray-100 rounded-2xl p-4 bg-white relative print:h-[500px] print:border-0">
                        <div className="absolute top-4 right-4 flex gap-3 text-xs bg-white/80 p-2 rounded-lg border">
                            <span>🏖️ วันเกษียณ ({inputs.retireAge || 0} ปี)</span>
                            <span>🏁 สิ้นอายุขัย ({inputs.lifeExpectancy || 0} ปี)</span>
                        </div>

                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart
                                data={results.chartData}
                                margin={{ top: 30, right: 30, left: 20, bottom: 20 }}
                                stackOffset="sign"
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <ReferenceLine y={0} stroke="#666" />
                                <XAxis 
                                    dataKey="age" 
                                    tick={{fontSize: 12}}
                                    interval="preserveStartEnd"
                                    label={{ value: 'อายุ (ปี)', position: 'insideBottom', offset: -10 }} 
                                />
                                <YAxis 
                                    tickFormatter={(value) => `${((parseFloat(value) || 0) / 1000000).toFixed(1)}M`}
                                    tick={{fontSize: 12}}
                                />
                                <Tooltip 
                                    formatter={(value, name) => {
                                        if (name === 'total') return [formatMoney(value), 'สินทรัพย์รวมสุทธิ'];
                                        return [formatMoney(value), name];
                                    }}
                                    labelFormatter={(label) => {
                                        const item = results.chartData.find(d => d.age === label);
                                        return `อายุ ${label} ปี ${item && item.total !== undefined ? `(รวม: ${formatMoney(item.total)})` : ''}`;
                                    }}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                />
                                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                
                                <Bar dataKey="existingAssets" name="สินทรัพย์เดิม" stackId="a" fill="#94a3b8" />
                                <Bar dataKey="newSavings" name="เงินลงทุนเพิ่ม" stackId="a" fill="#3b82f6" />
                                <Bar dataKey="interest" name="กำไรลงทุน" stackId="a" fill="#22c55e" radius={[4, 4, 0, 0]}>
                                    <LabelList dataKey="marker" position="top" offset={10} />
                                </Bar>
                                
                                <Bar dataKey="withdrawal" name="เงินที่ถอนออก" fill="#ef4444" radius={[0, 0, 4, 4]} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-500 justify-center">
                         <div className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-slate-400 rounded-sm"></div> สินทรัพย์เดิม
                         </div>
                         <div className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-blue-500 rounded-sm"></div> เงินลงทุนเพิ่ม
                         </div>
                         <div className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-green-500 rounded-sm"></div> กำไรลงทุน
                         </div>
                         <div className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-red-500 rounded-sm"></div> เงินที่ถอนออก
                         </div>
                    </div>
                </div>
                </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RetirementPlanner;