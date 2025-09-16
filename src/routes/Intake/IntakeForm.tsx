import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Save, X, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useSearchParams, useNavigate } from 'react-router-dom';

const intakeFormSchema = z.object({
  // Demographics
  gender: z.enum(['ذكر', 'أنثى']).optional(),
  dob: z.string().optional().refine((val) => {
    if (!val) return true;
    const date = new Date(val);
    return date <= new Date();
  }, 'Date of birth cannot be in the future'),
  profession: z.string().max(100).optional(),
  address: z.string().max(500).optional(),
  phone: z.string().optional(),
  
  // Special Conditions
  specialConditions: z.array(z.string()).optional(),
  otherCondition: z.string().max(200).optional(),
  
  // Medical History
  hasAllergies: z.boolean().optional(),
  allergies: z.string().max(500).optional(),
  hasMedications: z.boolean().optional(),
  medications: z.string().max(500).optional(),
  hasSurgeries: z.boolean().optional(),
  surgeries: z.string().max(500).optional(),
  isSmoker: z.boolean().optional(),
  cigarettesPerDay: z.number().min(0).max(100).optional(),
  
  // Chronic Conditions
  chronicConditions: z.record(z.boolean()).optional(),
  
  // Reason for Visit
  reasonForVisit: z.string().max(1000),
});

type IntakeFormData = z.infer<typeof intakeFormSchema>;

const specialConditionsList = [
  'الحمل',
  'الرضاعة', 
  'أمراض خبيثة',
  'أمراض الدم (سيولة / تجلطات)',
  'علاج كيميائي',
  'علاج إشعاعي',
  'أخرى'
];

const chronicConditionsList = [
  { key: 'heart', label: 'أمراض القلب' },
  { key: 'diabetes', label: 'أمراض السكر' },
  { key: 'hypertension', label: 'أمراض الضغط' },
  { key: 'liver', label: 'أمراض ال��بد' },
  { key: 'kidney', label: 'أمراض الكلى' },
  { key: 'respiratory', label: 'أمراض الصدر والرئة' },
  { key: 'thyroid', label: 'أمراض الغدة' },
  { key: 'epilepsy', label: 'الصرع' },
  { key: 'psychiatric', label: 'توتر واكتئاب' },
];

export default function IntakeForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const patientId = searchParams.get('patient');
  const [patient, setPatient] = useState<any>(null);
  const [signatureData, setSignatureData] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<IntakeFormData>({
    resolver: zodResolver(intakeFormSchema),
    defaultValues: {
      specialConditions: [],
      chronicConditions: {},
      hasAllergies: false,
      hasMedications: false,
      hasSurgeries: false,
      isSmoker: false,
    }
  });

  const watchedValues = watch();

  // Load patient data
  useEffect(() => {
    if (patientId) {
      loadPatientData();
    }
  }, [patientId]);

  const loadPatientData = async () => {
    if (!patientId) return;
    
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('id', patientId)
      .single();

    if (error) {
      toast({
        title: "خطأ",
        description: "فشل في تحميل بيانات المريض",
        variant: "destructive",
      });
      return;
    }

    setPatient(data);
    
    // Pre-fill form with patient data
    if (data.phone) setValue('phone', data.phone);
    if (data.profession) setValue('profession', data.profession);
    if (data.address) setValue('address', data.address);
    if (data.dob) setValue('dob', data.dob);
    if (data.gender) setValue('gender', data.gender as 'ذكر' | 'أنثى');
    if (data.allergies) {
      setValue('hasAllergies', true);
      setValue('allergies', data.allergies);
    }
    if (data.current_meds) {
      setValue('hasMedications', true);
      setValue('medications', data.current_meds);
    }
    if (data.prior_surgeries) {
      setValue('hasSurgeries', true);
      setValue('surgeries', data.prior_surgeries);
    }
    if (data.smoker !== null) {
      setValue('isSmoker', data.smoker);
    }
    if (data.reason_for_visit) {
      setValue('reasonForVisit', data.reason_for_visit);
    }
  };

  // Signature pad functions
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#000';
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    if (canvasRef.current) {
      setSignatureData(canvasRef.current.toDataURL());
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setSignatureData('');
      }
    }
  };

  const onSubmit = async (data: IntakeFormData) => {
    if (!patientId) {
      toast({
        title: "خطأ",
        description: "لا يوجد مريض محدد",
        variant: "destructive",
      });
      return;
    }

    if (!signatureData) {
      toast({
        title: "التوقيع مطلوب",
        description: "يرجى التوقيع في المربع المخصص",
        variant: "destructive",
      });
      return;
    }

    try {
      // Save intake form
      const { error: intakeError } = await supabase
        .from('intake_forms')
        .insert({
          patient_id: patientId,
          answers: data,
          signature_url: signatureData, // In real app, upload to storage
          is_active: true,
          active_signed: true,
          signed_at: new Date().toISOString(),
        });

      if (intakeError) throw intakeError;

      // Update patient with intake data and mark as ready
      const { error: patientError } = await supabase
        .from('patients')
        .update({
          dob: data.dob || null,
          gender: data.gender || null,
          profession: data.profession,
          address: data.address,
          phone: data.phone,
          allergies: data.hasAllergies ? data.allergies : null,
          current_meds: data.hasMedications ? data.medications : null,
          prior_surgeries: data.hasSurgeries ? data.surgeries : null,
          smoker: data.isSmoker,
          reason_for_visit: data.reasonForVisit,
          status: 'ready'
        })
        .eq('id', patientId);

      if (patientError) throw patientError;

      // Sync any related appointments to ready
      await supabase
        .from('appointments')
        .update({ status: 'ready' })
        .eq('patient_id', patientId);

      toast({
        title: "تم الحفظ بنجاح",
        description: "تم حفظ الاستمارة وتم نقل المريض إلى قائمة الجاهزين",
      });

      // Navigate back to intake list
      navigate('/intake');

    } catch (error) {
      console.error('Error saving intake form:', error);
      toast({
        title: "خطأ في الحفظ",
        description: "فشل في حفظ الاستمارة، يرجى المحاولة مرة أخرى",
        variant: "destructive",
      });
    }
  };

  if (!patientId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
        <Card className="max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-destructive">خطأ</CardTitle>
            <CardDescription>لا يوجد مريض محدد للاستمارة</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <div className="bg-card border-b p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/intake')}
              className="shrink-0"
            >
              <ArrowLeft className="h-4 w-4 ml-2" />
              العودة
            </Button>
            <h1 className="text-2xl font-bold">استمارة المريض</h1>
          </div>
          
          {patient && (
            <div className="text-center space-y-2">
              <div className="text-lg font-medium">{patient.arabic_full_name}</div>
              {patient.phone && (
                <div className="text-sm text-muted-foreground">{patient.phone}</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Form */}
      <div className="max-w-4xl mx-auto p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Demographics */}
          <Card>
            <CardHeader>
              <CardTitle>البيانات الشخصية</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>الجنس</Label>
                  <RadioGroup
                    value={watchedValues.gender}
                    onValueChange={(value) => setValue('gender', value as 'ذكر' | 'أنثى')}
                    className="flex gap-6"
                  >
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <RadioGroupItem value="ذكر" id="male" />
                      <Label htmlFor="male" className="flex items-center gap-2">
                        ♂ ذكر
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <RadioGroupItem value="أنثى" id="female" />
                      <Label htmlFor="female" className="flex items-center gap-2">
                        ♀ أنثى
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dob">تاريخ الميلاد</Label>
                  <Input
                    id="dob"
                    type="date"
                    {...register('dob')}
                    className="text-right"
                  />
                  {errors.dob && (
                    <p className="text-sm text-destructive">{errors.dob.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="profession">المهنة</Label>
                  <Input
                    id="profession"
                    {...register('profession')}
                    className="text-right"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">رقم الهاتف</Label>
                  <Input
                    id="phone"
                    {...register('phone')}
                    className="text-right"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">العنوان</Label>
                <Textarea
                  id="address"
                  {...register('address')}
                  className="text-right min-h-[80px]"
                />
              </div>
            </CardContent>
          </Card>

          {/* Special Conditions */}
          <Card>
            <CardHeader>
              <CardTitle>حالات خاصة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {specialConditionsList.map((condition) => (
                  <div key={condition} className="flex items-center space-x-2 space-x-reverse">
                    <Checkbox
                      id={condition}
                      checked={watchedValues.specialConditions?.includes(condition)}
                      onCheckedChange={(checked) => {
                        const current = watchedValues.specialConditions || [];
                        if (checked) {
                          setValue('specialConditions', [...current, condition]);
                        } else {
                          setValue('specialConditions', current.filter(c => c !== condition));
                        }
                      }}
                    />
                    <Label htmlFor={condition}>{condition}</Label>
                  </div>
                ))}
              </div>

              {watchedValues.specialConditions?.includes('أخرى') && (
                <div className="mt-4 space-y-2">
                  <Label htmlFor="otherCondition">تحديد الحالة الأخرى</Label>
                  <Input
                    id="otherCondition"
                    {...register('otherCondition')}
                    className="text-right"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Medical History */}
          <Card>
            <CardHeader>
              <CardTitle>التاريخ المرضي</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Allergies */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox
                    id="hasAllergies"
                    checked={watchedValues.hasAllergies}
                    onCheckedChange={(checked) => setValue('hasAllergies', checked as boolean)}
                  />
                  <Label htmlFor="hasAllergies">هل تعاني من حساسية تجاه أي دواء؟</Label>
                </div>
                
                {watchedValues.hasAllergies && (
                  <Textarea
                    placeholder="اذكر الأدوية التي تسبب لك حساسية..."
                    {...register('allergies')}
                    className="text-right"
                  />
                )}
              </div>

              <Separator />

              {/* Medications */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox
                    id="hasMedications"
                    checked={watchedValues.hasMedications}
                    onCheckedChange={(checked) => setValue('hasMedications', checked as boolean)}
                  />
                  <Label htmlFor="hasMedications">هل تتناول أدوية حالياً؟</Label>
                </div>
                
                {watchedValues.hasMedications && (
                  <Textarea
                    placeholder="اذكر الأدوية التي تتناولها حالياً..."
                    {...register('medications')}
                    className="text-right"
                  />
                )}
              </div>

              <Separator />

              {/* Surgeries */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox
                    id="hasSurgeries"
                    checked={watchedValues.hasSurgeries}
                    onCheckedChange={(checked) => setValue('hasSurgeries', checked as boolean)}
                  />
                  <Label htmlFor="hasSurgeries">هل أجريت عمليات سابقة؟</Label>
                </div>
                
                {watchedValues.hasSurgeries && (
                  <Textarea
                    placeholder="اذكر العمليات التي أجريتها سابقاً..."
                    {...register('surgeries')}
                    className="text-right"
                  />
                )}
              </div>

              <Separator />

              {/* Smoking */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox
                    id="isSmoker"
                    checked={watchedValues.isSmoker}
                    onCheckedChange={(checked) => setValue('isSmoker', checked as boolean)}
                  />
                  <Label htmlFor="isSmoker">هل تدخن؟</Label>
                </div>
                
                {watchedValues.isSmoker && (
                  <div className="space-y-2">
                    <Label htmlFor="cigarettesPerDay">عدد السجائر/اليوم</Label>
                    <Input
                      id="cigarettesPerDay"
                      type="number"
                      min="0"
                      max="100"
                      {...register('cigarettesPerDay', { valueAsNumber: true })}
                      className="text-right max-w-xs"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Chronic Conditions */}
          <Card>
            <CardHeader>
              <CardTitle>الأمراض المزمنة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {chronicConditionsList.map((condition) => (
                  <div key={condition.key} className="flex items-center space-x-2 space-x-reverse">
                    <Checkbox
                      id={condition.key}
                      checked={watchedValues.chronicConditions?.[condition.key] || false}
                      onCheckedChange={(checked) => {
                        setValue(`chronicConditions.${condition.key}`, checked as boolean);
                      }}
                    />
                    <Label htmlFor={condition.key}>{condition.label}</Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Reason for Visit */}
          <Card>
            <CardHeader>
              <CardTitle>سبب الزيارة *</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="ما سبب زيارتك اليوم؟"
                {...register('reasonForVisit')}
                className="text-right min-h-[120px]"
                required
              />
              {errors.reasonForVisit && (
                <p className="text-sm text-destructive mt-2">{errors.reasonForVisit.message}</p>
              )}
            </CardContent>
          </Card>

          {/* Consent & Signature */}
          <Card>
            <CardHeader>
              <CardTitle>الموافقة والتوقيع</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-sm leading-relaxed p-4 bg-muted rounded-lg">
                أقر أنا الموقع أدناه أن جميع المعلومات أعلاه صحيحة حسب علمي، وأوافق على معالجة بياناتي الطبية من قبل العيادة لأغراض العلاج والمتابعة الطبية.
              </p>

              <div className="space-y-4">
                <Label>التوقيع *</Label>
                
                <div className="border-2 border-dashed border-muted-foreground rounded-lg p-4">
                  <canvas
                    ref={canvasRef}
                    width={600}
                    height={200}
                    className="border rounded w-full touch-none"
                    style={{ maxWidth: '100%', height: 'auto' }}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                  />
                  <div className="flex justify-between items-center mt-2">
                    <p className="text-sm text-muted-foreground">است��دم إصبعك أو القلم للتوقيع في المربع أعلاه</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={clearSignature}
                    >
                      مسح التوقيع
                    </Button>
                  </div>
                </div>

                {signatureData && (
                  <div className="space-y-2">
                    <Badge variant="outline" className="bg-green-50 text-green-700">
                      ✓ تم التوقيع
                    </Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Submit Buttons */}
          <div className="flex gap-4 justify-center">
            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting}
              className="px-8"
            >
              <Save className="h-5 w-5 ml-2" />
              {isSubmitting ? 'جاري الحفظ...' : 'حفظ وتأكيد'}
            </Button>
            
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => navigate('/intake')}
            >
              <X className="h-5 w-5 ml-2" />
              إلغاء
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
