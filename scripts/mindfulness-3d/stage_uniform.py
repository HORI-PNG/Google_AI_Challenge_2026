"""写真の形を参照しつつ、独自の立体形状で黒金の衣装を作る。"""
import math
import bpy
from mathutils import Vector


def build_stage_uniform():
    objects=[]

    def mat(name,col,metal=0,rough=.6):
        m=bpy.data.materials.new(name)
        m.use_nodes=True
        p=m.node_tree.nodes.get('Principled BSDF')
        p.inputs['Base Color'].default_value=(*col,1)
        p.inputs['Metallic'].default_value=metal
        p.inputs['Roughness'].default_value=rough
        return m

    black=mat('仕立てた黒ウール',(.008,.011,.017),rough=.72)
    satin=mat('襟の黒サテン',(.012,.016,.024),rough=.38)
    gold=mat('帯のゴールドメタル',(.74,.48,.12),.58,.38)
    gold_dark=mat('金のベルトの陰影',(.34,.19,.043),.60,.38)
    white=mat('襟の白い生地',(.72,.74,.76),rough=.65)

    def mesh(name,vs,fs,material):
        m=bpy.data.meshes.new(name)
        m.from_pydata(vs,[],fs)
        m.update()
        o=bpy.data.objects.new(name,m)
        bpy.context.collection.objects.link(o)
        o.data.materials.append(material)
        for p in m.polygons:p.use_smooth=True
        objects.append(o)
        return o

    def box(name,center,scale,material,bevel=.001,rotation=0):
        bpy.ops.mesh.primitive_cube_add(size=1,location=center)
        o=bpy.context.object
        o.name=name
        o.scale=scale
        o.rotation_euler.y=rotation
        bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
        o.data.materials.append(material)
        if bevel:
            b=o.modifiers.new('金属の丸い角','BEVEL')
            b.width=bevel;b.segments=3
            o.modifiers.new('安定した面の法線','WEIGHTED_NORMAL')
        objects.append(o)
        return o

    def line(name,points,radius,material):
        c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D'
        c.bevel_depth=radius;c.bevel_resolution=3;c.resolution_u=12
        s=c.splines.new('BEZIER');s.bezier_points.add(len(points)-1)
        for p,co in zip(s.bezier_points,points):
            p.co=co;p.handle_left_type='AUTO';p.handle_right_type='AUTO'
        o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o)
        o.data.materials.append(material);objects.append(o)
        return o

    # 体の筋肉の凹凸を拾いすぎない、ジャケットの仕立て。
    rings=[(.995,.154,.145),(1.055,.150,.145),(1.17,.159,.148),
           (1.31,.185,.160),(1.41,.198,.140),(1.465,.190,.116),
           (1.505,.135,.084),(1.532,.068,.070)]
    vs=[]
    for z,rx,ry in rings:
        for i in range(64):
            a=2*math.pi*i/64
            vs.append((rx*math.cos(a),-.025+ry*math.sin(a),z))
    fs=[(j*64+i,j*64+(i+1)%64,(j+1)*64+(i+1)%64,(j+1)*64+i)
        for j in range(len(rings)-1) for i in range(64)]
    jacket=mesh('仕立てたジャケットの胴',vs,fs,black)
    jacket.modifiers.new('縫製の厚み','SOLIDIFY').thickness=.004
    sub=jacket.modifiers.new('柔らかな布の曲面','SUBSURF');sub.levels=2

    def profile(z):
        for a,b in zip(rings[:-1],rings[1:]):
            if a[0]<=z<=b[0]:
                t=(z-a[0])/(b[0]-a[0]);return a[1]*(1-t)+b[1]*t,a[2]*(1-t)+b[2]*t
        return .15,.105

    def front(x,z,extra=.005):
        rx,ry=profile(z)
        y=-.025-ry*math.sqrt(max(.02,1-(x/rx)**2))-extra
        for name in ['人体・CC0 MakeHuman','黒いジャケットとパンツ']:
            obj=bpy.data.objects.get(name)
            if obj:
                hit,loc,normal,index=obj.ray_cast(Vector((x,-1,z)),Vector((0,1,0)))
                if hit:y=min(y,loc.y-extra)
        return y

    # 白シャツの開きと左右の起こした襟。
    shirt=[]
    for j in range(11):
        z=1.399+(1.519-1.399)*j/10
        width=max(.0005,.056*j/10)
        for k in range(9):
            x=width*(-1+2*k/8)
            shirt.append((x,front(x,z,.008),z))
    mesh('見える白シャツ',shirt,
         [(j*9+k,j*9+k+1,(j+1)*9+k+1,(j+1)*9+k) for j in range(10) for k in range(8)],white)
    for sign in [-1,1]:
        pts=[(sign*.026,-.097,1.553),(sign*.062,-.075,1.55),
             (sign*.096,front(sign*.096,1.498,.013),1.498),
             (sign*.002,front(sign*.002,1.391,.012),1.391),
             (sign*.055,front(sign*.055,1.498,.014),1.498)]
        o=mesh('立った黒の襟',pts,[(0,1,2,3,4)],satin)
        o.modifiers.new('襟の厚み','SOLIDIFY').thickness=.005
        o.modifiers.new('襟の角','BEVEL').width=.002
        line('襟のステッチ',[pts[0],pts[4],pts[3]],.0007,black)

    # 胸を横切る二本の金属装飾。連続した立体パーツで光を拾う。
    for sign in [-1,1]:
        start=Vector((sign*.151,0,1.475));end=Vector((-sign*.118,0,1.105))
        direction=(end-start).normalized()
        across=Vector((-direction.z,0,direction.x))
        width=.041
        v=[]
        for j in range(49):
            t=j/48;p=start.lerp(end,t)
            for edge in [-1,1]:
                q=p+across*(edge*width/2)
                q.y=front(q.x,q.z,.008+(0.006 if sign==1 else 0))
                v.append(q)
        strap=mesh('金のクロスベルトの基部',v,[(i*2,i*2+1,i*2+3,i*2+2) for i in range(48)],gold_dark)
        strap.modifiers.new('ベルトの厚み','SOLIDIFY').thickness=.003
        # 写真の弾帯のように、細い金属の棒を段ごとに並べる。
        angle=math.atan2(-across.z,across.x)
        for j in range(43):
            t=(j+.5)/43;p=start.lerp(end,t)
            p.y=front(p.x,p.z,.013+(0.006 if sign==1 else 0))
            box('金の装飾の連続バー',p,(width,.008,.0064),gold,.0014,angle)
            # バーの上下の小さな高低差が金属らしい反射を作る。
            for edge in [-1,1]:
                q=p+across*(edge*.016)
                q.y-=.003
                box('帯の縁の金具',q,(.004,.010,.0074),gold,.001,angle)
        for edge in [-1,1]:
            points=[]
            for j in range(15):
                p=start.lerp(end,j/14)+across*(edge*width/2)
                p.y=front(p.x,p.z,.012+(0.006 if sign==1 else 0))
                points.append(p)
            line('金帯のパイピング',points,.0011,gold)

    # 背面へ回り込む帯。首・肩から腰まで同じ幅でつなぐ。
    for sign in [-1,1]:
        v=[]
        for j in range(41):
            t=j/40;x=sign*(.15-.265*t);z=1.473-.365*t
            rx,ry=profile(z)
            y=-.025+ry*math.sqrt(max(.02,1-(x/rx)**2))+.005
            for edge in [-1,1]:
                v.append((x+edge*.016,y,z+sign*edge*.011))
        o=mesh('背中の金帯',v,[(j*2,j*2+1,j*2+3,j*2+2) for j in range(40)],gold_dark)
        o.modifiers.new('背中ベルトの厚み','SOLIDIFY').thickness=.003
        for j in range(35):
            t=(j+.5)/35;x=sign*(.15-.265*t);z=1.473-.365*t
            rx,ry=profile(z);y=-.025+ry*math.sqrt(max(.02,1-(x/rx)**2))+.009
            box('背中のベルトの金属',(x,y,z),(.035,.005,.0055),gold,.001,sign*.62)

    # ウエストの三本の光沢ベルト。
    for j,z in enumerate([1.015,1.045,1.075]):
        v=[]
        for dz in [-.012,.012]:
            for k in range(96):
                a=2*math.pi*k/96
                v.append((.166*math.cos(a),-.025+.155*math.sin(a),z+dz))
        belt=mesh('腰のゴールドベルト',v,[(k,(k+1)%96,(k+1)%96+96,k+96) for k in range(96)],gold)
        belt.modifiers.new('ベルトの厚み','SOLIDIFY').thickness=.004
        box('ベルトの留め金',(.014,-.185,z),(.043,.013,.020),gold_dark,.003)
        box('留め金の光沢',(.014,-.194,z),(.025,.006,.010),gold,.001)
        for x in [-.075,-.049,.063,.086]:
            y=-.025-.157*math.sqrt(1-(x/.166)**2)
            box('ベルトの細い装飾',(x,y-.003,z),(.004,.007,.018),gold_dark,.001)

    # 肩章は小さく、袖とのつながりを明確にする。
    for sign in [-1,1]:
        box('黒の肩章',(sign*.166,-.010,1.478),(.059,.075,.011),satin,.006)
        for i in range(5):
            box('肩章の金線',(sign*(.145+i*.009),-.014,1.485),(.004,.062,.005),gold,.001)
    return objects
