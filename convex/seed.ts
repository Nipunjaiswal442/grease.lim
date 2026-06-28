import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const GROUPS = [
  {groupCode:"G01",code:1,name:"Black Al and Al-complex greases",colour:"BLACK",thickener:"AlX"},
  {groupCode:"G02",code:2,name:"Black Ca - Greases",colour:"BLACK",thickener:"Ca"},
  {groupCode:"G03",code:3,name:"Black Li/LiX-Ca greases",colour:"BLACK",thickener:"LiX"},
  {groupCode:"G04",code:4,name:"Black NS/TiLi greases",colour:"BLACK",thickener:"Clay"},
  {groupCode:"G05",code:5,name:"Brown Al and Al-complex greases",colour:"BROWN",thickener:"AlX"},
  {groupCode:"G06",code:6,name:"Brown Ca/CaX and CaS-complex greases",colour:"BROWN",thickener:"CaS"},
  {groupCode:"G07",code:7,name:"Brown Li/LiXCa/Li-Ca plain, mixed and complex greases",colour:"BROWN",thickener:"LiX"},
  {groupCode:"G08",code:8,name:"Dark Brown Li/LiXCa/Li-Ca plain, mixed and complex greases",colour:"DARK BROWN",thickener:"LiX"},
  {groupCode:"G09",code:9,name:"Dark Brown Na-greases",colour:"DARK BROWN",thickener:"Na"},
  {groupCode:"G10",code:10,name:"Grey Black Al/AlX greases",colour:"GREY BLACK",thickener:"AlX"},
  {groupCode:"G11",code:11,name:"Ca/CaX/CaS Grey Black grease",colour:"GREY BLACK",thickener:"CaS"},
  {groupCode:"G12",code:12,name:"Grey Black Li/LiXCa/Li-Ca plain, mixed and complex greases",colour:"GREY BLACK",thickener:"LiX"},
  {groupCode:"G13",code:13,name:"Grey Black Non Soap Clay Base greases",colour:"GREY BLACK",thickener:"Clay"},
  {groupCode:"G14",code:14,name:"Grey Brown Na-greases",colour:"GREY BROWN",thickener:"Na"},
  {groupCode:"G15",code:15,name:"Light Brown Li plain, mixed and complex greases",colour:"LIGHT BROWN",thickener:"Li12OH"},
  {groupCode:"G16",code:16,name:"Off White to Light Brown Li/LiXCa/Li-Ca greases",colour:"OFF WHITE",thickener:"LiX"},
  {groupCode:"G17",code:17,name:"Off White WAX mixture greases",colour:"OFF WHITE",thickener:"Silica"},
  {groupCode:"G18",code:18,name:"Red Li/LiXCa/Li-Ca plain, mixed and complex greases",colour:"RED",thickener:"LiX"},
  {groupCode:"G19",code:19,name:"Very Black Li/LiXCa/Li-Ca plain, mixed and complex greases",colour:"VERY BLACK",thickener:"LiX"},
  {groupCode:"G20",code:20,name:"White Al/AlX greases",colour:"WHITE",thickener:"AlX"},
  {groupCode:"G21",code:21,name:"White Ca-Sulfonate with WAX mixture greases",colour:"WHITE",thickener:"CaS"},
  {groupCode:"G22",code:22,name:"White Li/LiXCa/Li-Ca plain, mixed and complex greases",colour:"WHITE",thickener:"LiX"},
  {groupCode:"G23",code:23,name:"Ca/CaX/CaS Yellow Brown greases",colour:"YELLOW BROWN",thickener:"CaS"},
  {groupCode:"G24",code:24,name:"Na-K base with watered Yellow Brown greases",colour:"YELLOW BROWN",thickener:"Na"},
  {groupCode:"G25",code:25,name:"Yellow Brown WAX mixture greases",colour:"YELLOW BROWN",thickener:"Silica"},
];

const GRADES = [
  {gradeId:"7770",name:"SERVOGEM EP 2",groupCode:"G01",hasDye:false,isBituminous:false,isSynthetic:false,isFoodGrade:false},
  {gradeId:"7763",name:"SERVOGEM EP 3",groupCode:"G01",hasDye:false,isBituminous:false,isSynthetic:false,isFoodGrade:false},
  {gradeId:"7780",name:"SERVO AL-COMPLEX EP 2",groupCode:"G01",hasDye:false,isBituminous:false,isSynthetic:false,isFoodGrade:false},
  {gradeId:"7781",name:"SERVO AL-COMPLEX EP 3",groupCode:"G01",hasDye:false,isBituminous:false,isSynthetic:false,isFoodGrade:false},
  {gradeId:"7201",name:"SERVOCOAT 1",groupCode:"G02",hasDye:false,isBituminous:false,isSynthetic:false,isFoodGrade:false},
  {gradeId:"7202",name:"SERVOCOAT 2",groupCode:"G02",hasDye:false,isBituminous:false,isSynthetic:false,isFoodGrade:false},
  {gradeId:"7203",name:"SERVO CA GREASE 2",groupCode:"G02",hasDye:false,isBituminous:false,isSynthetic:false,isFoodGrade:false},
  {gradeId:"7301",name:"SERVO GREASE LiX-1",groupCode:"G03",hasDye:false,isBituminous:false,isSynthetic:false,isFoodGrade:false},
  {gradeId:"7302",name:"SERVO GREASE LiX-2",groupCode:"G03",hasDye:false,isBituminous:false,isSynthetic:false,isFoodGrade:false},
  {gradeId:"7303",name:"SERVO LiX EP 3",groupCode:"G03",hasDye:false,isBituminous:false,isSynthetic:false,isFoodGrade:false},
  {gradeId:"7401",name:"SERVO NS GREASE 2",groupCode:"G04",hasDye:false,isBituminous:false,isSynthetic:false,isFoodGrade:false},
  {gradeId:"7402",name:"SERVO BENTONE GREASE",groupCode:"G04",hasDye:false,isBituminous:false,isSynthetic:false,isFoodGrade:false},
  {gradeId:"7501",name:"SERVOBIX AL-2",groupCode:"G05",hasDye:false,isBituminous:true,isSynthetic:false,isFoodGrade:false},
  {gradeId:"7502",name:"SERVO AL-COMPLEX BROWN 3",groupCode:"G05",hasDye:false,isBituminous:false,isSynthetic:false,isFoodGrade:false},
  {gradeId:"7601",name:"SERVO CAS GREASE 2",groupCode:"G06",hasDye:false,isBituminous:false,isSynthetic:false,isFoodGrade:false},
  {gradeId:"7602",name:"SERVO CaX EP 3",groupCode:"G06",hasDye:false,isBituminous:false,isSynthetic:false,isFoodGrade:false},
  {gradeId:"7603",name:"SERVO CAS-COMPLEX 2",groupCode:"G06",hasDye:false,isBituminous:false,isSynthetic:false,isFoodGrade:false},
  {gradeId:"7701",name:"SERVO GREASE C",groupCode:"G07",hasDye:false,isBituminous:false,isSynthetic:false,isFoodGrade:false},
  {gradeId:"7702",name:"SERVOGEM EP 2 LI",groupCode:"G07",hasDye:false,isBituminous:false,isSynthetic:false,isFoodGrade:false},
  {gradeId:"7703",name:"SERVO LI EP 3 BROWN",groupCode:"G07",hasDye:false,isBituminous:false,isSynthetic:false,isFoodGrade:false},
  {gradeId:"7724",name:"SERVOGEM EP 2(L)",groupCode:"G07",hasDye:true,isBituminous:false,isSynthetic:false,isFoodGrade:false},
  {gradeId:"7742",name:"SERVOGEM EP 2(S)",groupCode:"G08",hasDye:false,isBituminous:false,isSynthetic:false,isFoodGrade:false},
  {gradeId:"7801",name:"SERVO DARK LI 2",groupCode:"G08",hasDye:false,isBituminous:false,isSynthetic:false,isFoodGrade:false},
  {gradeId:"7802",name:"SERVO LITHON EP 3",groupCode:"G08",hasDye:false,isBituminous:false,isSynthetic:false,isFoodGrade:false},
  {gradeId:"7901",name:"SERVOMARINE 2",groupCode:"G09",hasDye:false,isBituminous:false,isSynthetic:false,isFoodGrade:false},
  {gradeId:"7902",name:"SERVOMARINE HD",groupCode:"G09",hasDye:false,isBituminous:false,isSynthetic:false,isFoodGrade:false},
  {gradeId:"7903",name:"SERVO NA GREASE 3",groupCode:"G09",hasDye:false,isBituminous:false,isSynthetic:false,isFoodGrade:false},
  {gradeId:"1001",name:"SERVO AL-GB 2",groupCode:"G10",hasDye:false,isBituminous:false,isSynthetic:false,isFoodGrade:false},
  {gradeId:"1002",name:"SERVO ALX GB EP 3",groupCode:"G10",hasDye:false,isBituminous:false,isSynthetic:false,isFoodGrade:false},
  {gradeId:"1101",name:"SERVO CAS GB 2",groupCode:"G11",hasDye:false,isBituminous:false,isSynthetic:false,isFoodGrade:false},
  {gradeId:"1102",name:"SERVO CaX GB EP 3",groupCode:"G11",hasDye:false,isBituminous:false,isSynthetic:false,isFoodGrade:false},
  {gradeId:"1201",name:"SERVO LI GB 2",groupCode:"G12",hasDye:false,isBituminous:false,isSynthetic:false,isFoodGrade:false},
  {gradeId:"1202",name:"SERVO LI GB EP 3",groupCode:"G12",hasDye:false,isBituminous:false,isSynthetic:false,isFoodGrade:false},
  {gradeId:"1203",name:"SERVO LiX-COMPLEX GB",groupCode:"G12",hasDye:false,isBituminous:false,isSynthetic:false,isFoodGrade:false},
  {gradeId:"1301",name:"SERVO BENTONE 2",groupCode:"G13",hasDye:false,isBituminous:false,isSynthetic:false,isFoodGrade:false},
  {gradeId:"1302",name:"SERVO CLAY BASE 3",groupCode:"G13",hasDye:false,isBituminous:false,isSynthetic:false,isFoodGrade:false},
  {gradeId:"1401",name:"SERVO NA GB 2",groupCode:"G14",hasDye:false,isBituminous:false,isSynthetic:false,isFoodGrade:false},
  {gradeId:"1402",name:"SERVO NA-WATERED GB",groupCode:"G14",hasDye:false,isBituminous:false,isSynthetic:false,isFoodGrade:false},
  {gradeId:"1501",name:"SERVOLINE LB 2",groupCode:"G15",hasDye:false,isBituminous:false,isSynthetic:false,isFoodGrade:false},
  {gradeId:"1502",name:"SERVO LI PLAIN 3",groupCode:"G15",hasDye:false,isBituminous:false,isSynthetic:false,isFoodGrade:false},
  {gradeId:"1503",name:"SERVO LI PLAIN EP 2",groupCode:"G15",hasDye:false,isBituminous:false,isSynthetic:false,isFoodGrade:false},
  {gradeId:"1504",name:"SERVOLINE EP 3 LB",groupCode:"G15",hasDye:false,isBituminous:false,isSynthetic:false,isFoodGrade:false},
  {gradeId:"1601",name:"SERVO LI OW 2",groupCode:"G16",hasDye:false,isBituminous:false,isSynthetic:false,isFoodGrade:false},
  {gradeId:"1602",name:"SERVOGEM WHITE LI 3",groupCode:"G16",hasDye:false,isBituminous:false,isSynthetic:false,isFoodGrade:false},
  {gradeId:"1603",name:"SERVO LiX OW EP 2",groupCode:"G16",hasDye:false,isBituminous:false,isSynthetic:false,isFoodGrade:false},
  {gradeId:"1701",name:"SERVO WAX 2",groupCode:"G17",hasDye:false,isBituminous:false,isSynthetic:false,isFoodGrade:false},
  {gradeId:"1702",name:"SERVO WAX HD 3",groupCode:"G17",hasDye:false,isBituminous:false,isSynthetic:false,isFoodGrade:false},
  {gradeId:"1801",name:"SERVO RED LI 2",groupCode:"G18",hasDye:true,isBituminous:false,isSynthetic:false,isFoodGrade:false},
  {gradeId:"1802",name:"SERVO RED EP 3",groupCode:"G18",hasDye:true,isBituminous:false,isSynthetic:false,isFoodGrade:false},
  {gradeId:"1803",name:"SERVO RED LiX EP 2",groupCode:"G18",hasDye:true,isBituminous:false,isSynthetic:false,isFoodGrade:false},
  {gradeId:"1901",name:"SERVO VB LI 2",groupCode:"G19",hasDye:false,isBituminous:false,isSynthetic:false,isFoodGrade:false},
  {gradeId:"1902",name:"SERVO VB EP 3",groupCode:"G19",hasDye:false,isBituminous:false,isSynthetic:false,isFoodGrade:false},
  {gradeId:"1903",name:"SERVO VB LiX COMPLEX",groupCode:"G19",hasDye:false,isBituminous:false,isSynthetic:false,isFoodGrade:false},
  {gradeId:"2001",name:"SERVO WHITE AL 2",groupCode:"G20",hasDye:false,isBituminous:false,isSynthetic:false,isFoodGrade:false},
  {gradeId:"2002",name:"SERVOALUM WH EP 3",groupCode:"G20",hasDye:false,isBituminous:false,isSynthetic:false,isFoodGrade:false},
  {gradeId:"2003",name:"SERVO AL-COMPLEX WHITE",groupCode:"G20",hasDye:false,isBituminous:false,isSynthetic:false,isFoodGrade:false},
  {gradeId:"2101",name:"SERVO CAS WHITE WAX 2",groupCode:"G21",hasDye:false,isBituminous:false,isSynthetic:false,isFoodGrade:false},
  {gradeId:"2102",name:"SERVO WHITE SULF EP 3",groupCode:"G21",hasDye:false,isBituminous:false,isSynthetic:false,isFoodGrade:false},
  {gradeId:"2201",name:"SERVO WHITE LI 2",groupCode:"G22",hasDye:false,isBituminous:false,isSynthetic:false,isFoodGrade:false},
  {gradeId:"2202",name:"SERVO WHITE LI EP 3",groupCode:"G22",hasDye:false,isBituminous:false,isSynthetic:false,isFoodGrade:false},
  {gradeId:"2203",name:"SERVOFOOD GREASE 2",groupCode:"G22",hasDye:false,isBituminous:false,isSynthetic:false,isFoodGrade:true},
  {gradeId:"2204",name:"SERVOFOOD EP 3",groupCode:"G22",hasDye:false,isBituminous:false,isSynthetic:false,isFoodGrade:true},
  {gradeId:"5001",name:"SERVOSYNTH POLY 2",groupCode:"G22",hasDye:false,isBituminous:false,isSynthetic:true,isFoodGrade:false},
  {gradeId:"5002",name:"SERVOSYNTH POLY 3",groupCode:"G22",hasDye:false,isBituminous:false,isSynthetic:true,isFoodGrade:false},
  {gradeId:"2301",name:"SERVO YB CAS 2",groupCode:"G23",hasDye:false,isBituminous:false,isSynthetic:false,isFoodGrade:false},
  {gradeId:"2302",name:"SERVO YB CAS EP 3",groupCode:"G23",hasDye:false,isBituminous:false,isSynthetic:false,isFoodGrade:false},
  {gradeId:"2303",name:"SERVO CaX YB COMPLEX",groupCode:"G23",hasDye:false,isBituminous:false,isSynthetic:false,isFoodGrade:false},
  {gradeId:"2401",name:"SERVO NA-K YB 2",groupCode:"G24",hasDye:false,isBituminous:false,isSynthetic:false,isFoodGrade:false},
  {gradeId:"2402",name:"SERVO NA YB WATERED",groupCode:"G24",hasDye:false,isBituminous:false,isSynthetic:false,isFoodGrade:false},
  {gradeId:"2501",name:"SERVO YB WAX 2",groupCode:"G25",hasDye:false,isBituminous:false,isSynthetic:false,isFoodGrade:false},
  {gradeId:"2502",name:"SERVO YB WAX HD 3",groupCode:"G25",hasDye:false,isBituminous:false,isSynthetic:false,isFoodGrade:false},
];

const EQUIPMENT = [
  {equipmentId:"R-101",displayName:"Reactor 1",type:"REACTOR" as const,capacityT:5,outOfOrder:false},
  {equipmentId:"R-102",displayName:"Reactor 2",type:"REACTOR" as const,capacityT:8,outOfOrder:false},
  {equipmentId:"K-101",displayName:"Kettle 1",type:"KETTLE" as const,capacityT:3,outOfOrder:false},
  {equipmentId:"K-102",displayName:"Kettle 2",type:"KETTLE" as const,capacityT:3,outOfOrder:false},
  {equipmentId:"K-103",displayName:"Kettle 3",type:"KETTLE" as const,capacityT:5,outOfOrder:false},
  {equipmentId:"K-104",displayName:"Kettle 4",type:"KETTLE" as const,capacityT:3,outOfOrder:true},
  {equipmentId:"K-105",displayName:"Kettle 5",type:"KETTLE" as const,capacityT:3,outOfOrder:false},
  {equipmentId:"K-106",displayName:"Kettle 6",type:"KETTLE" as const,capacityT:8,outOfOrder:false},
  {equipmentId:"K-107",displayName:"Kettle 7",type:"KETTLE" as const,capacityT:3,outOfOrder:false},
  {equipmentId:"H-101",displayName:"Homogeniser 1",type:"HOMOGENISER" as const,outOfOrder:false},
  {equipmentId:"H-102",displayName:"Homogeniser 2",type:"HOMOGENISER" as const,outOfOrder:false},
  {equipmentId:"H-103",displayName:"Homogeniser 3",type:"HOMOGENISER" as const,outOfOrder:false},
  {equipmentId:"H-104",displayName:"Homogeniser 4",type:"HOMOGENISER" as const,outOfOrder:false},
  {equipmentId:"H-105",displayName:"Homogeniser 5",type:"HOMOGENISER" as const,outOfOrder:false},
  {equipmentId:"FP-101",displayName:"Filling Point 1",type:"FILLING_POINT" as const,outOfOrder:false},
  {equipmentId:"FP-102",displayName:"Filling Point 2",type:"FILLING_POINT" as const,outOfOrder:false},
  {equipmentId:"FP-103",displayName:"Filling Point 3",type:"FILLING_POINT" as const,outOfOrder:false},
  {equipmentId:"FP-104",displayName:"Filling Point 4",type:"FILLING_POINT" as const,outOfOrder:false},
  {equipmentId:"FP-105",displayName:"Filling Point 5",type:"FILLING_POINT" as const,outOfOrder:false},
];

function buildCompatMatrix() {
  const groupThickener: Record<string,string> = {
    G01:'AlX',G02:'Ca',G03:'LiX',G04:'Clay',G05:'AlX',G06:'CaS',G07:'LiX',G08:'LiX',
    G09:'Na',G10:'AlX',G11:'CaS',G12:'LiX',G13:'Clay',G14:'Na',G15:'Li12OH',G16:'LiX',
    G17:'Silica',G18:'LiX',G19:'LiX',G20:'AlX',G21:'CaS',G22:'LiX',G23:'CaS',G24:'Na',G25:'Silica'
  };
  const tc: Record<string,Record<string,string>> = {
    AlX:   {AlX:'C',Ca:'B',CaS:'C',LiX:'B',Clay:'X',Li12OH:'B',Na:'X',Silica:'X'},
    Ca:    {AlX:'B',Ca:'C',CaS:'B',LiX:'B',Clay:'X',Li12OH:'C',Na:'C',Silica:'X'},
    CaS:   {AlX:'C',Ca:'B',CaS:'C',LiX:'B',Clay:'X',Li12OH:'B',Na:'X',Silica:'X'},
    LiX:   {AlX:'B',Ca:'B',CaS:'B',LiX:'C',Clay:'X',Li12OH:'C',Na:'B',Silica:'X'},
    Clay:  {AlX:'X',Ca:'X',CaS:'X',LiX:'X',Clay:'C',Li12OH:'X',Na:'X',Silica:'X'},
    Li12OH:{AlX:'B',Ca:'C',CaS:'B',LiX:'C',Clay:'X',Li12OH:'C',Na:'B',Silica:'X'},
    Na:    {AlX:'X',Ca:'C',CaS:'X',LiX:'B',Clay:'X',Li12OH:'B',Na:'C',Silica:'X'},
    Silica:{AlX:'X',Ca:'X',CaS:'X',LiX:'X',Clay:'X',Li12OH:'X',Na:'X',Silica:'C'},
  };
  const mapR: Record<string, "COMPATIBLE"|"BORDERLINE"|"INCOMPATIBLE"> = {
    C:'COMPATIBLE',B:'BORDERLINE',X:'INCOMPATIBLE'
  };
  const groups: string[] = [];
  for (let i=1;i<=25;i++) groups.push(`G${String(i).padStart(2,'0')}`);
  const matrix: {fromGroupCode:string,toGroupCode:string,relation:"SAME"|"COMPATIBLE"|"BORDERLINE"|"INCOMPATIBLE"}[] = [];
  for (const f of groups) {
    for (const t of groups) {
      let rel: "SAME"|"COMPATIBLE"|"BORDERLINE"|"INCOMPATIBLE";
      if (f===t) { rel='SAME'; }
      else {
        const c = tc[groupThickener[f]]?.[groupThickener[t]] ?? 'X';
        rel = mapR[c] ?? 'INCOMPATIBLE';
      }
      matrix.push({fromGroupCode:f,toGroupCode:t,relation:rel});
    }
  }
  return matrix;
}

export const isSeedComplete = query({
  args: {},
  handler: async (ctx) => {
    const state = await ctx.db.query("seedState").first();
    return state?.completed ?? false;
  },
});

export const seedDatabase = mutation({
  args: { force: v.optional(v.boolean()) },
  handler: async (ctx, { force }) => {
    const state = await ctx.db.query("seedState").first();
    if (state?.completed && !force) return { status: "already_seeded" };

    // Clear existing data if forcing
    if (force) {
      for (const table of ["groups","grades","compatibility","equipment","batches","seedState"] as const) {
        const docs = await ctx.db.query(table as any).collect();
        for (const doc of docs) await ctx.db.delete(doc._id);
      }
    }

    // Seed groups
    for (const g of GROUPS) await ctx.db.insert("groups", g);

    // Seed grades
    for (const gr of GRADES) await ctx.db.insert("grades", gr);

    // Seed compatibility
    for (const c of buildCompatMatrix()) await ctx.db.insert("compatibility", c);

    // Seed equipment
    for (const eq of EQUIPMENT) {
      await ctx.db.insert("equipment", {
        ...eq,
        status: eq.outOfOrder ? "OUT_OF_ORDER" : "AVAILABLE",
      });
    }

    await ctx.db.insert("seedState", { completed: true, completedAt: Date.now() });
    return { status: "seeded" };
  },
});
