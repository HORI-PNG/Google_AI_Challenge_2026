"""CC0 人体を土台にした、黒金の舞台衣装の3D見本を再現可能に生成する。"""
import bpy
import bmesh
import json
import math
import sys
from pathlib import Path
from mathutils import Vector, Matrix

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
SOURCE = ROOT / 'source'
DRAFT = '--draft' in sys.argv
ONLY = next((a.split('=')[1] for a in sys.argv if a.startswith('--view=')), None)

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)


def material(name, color, metallic=0.0, roughness=0.45, noise=False):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (*color, 1)
    p.inputs['Metallic'].default_value = metallic
    p.inputs['Roughness'].default_value = roughness
    if noise:
        n = m.node_tree.nodes.new('ShaderNodeTexNoise')
        n.inputs['Scale'].default_value = 650
        n.inputs['Detail'].default_value = 2
        bump = m.node_tree.nodes.new('ShaderNodeBump')
        bump.inputs['Strength'].default_value = .15
        bump.inputs['Distance'].default_value = .0008
        m.node_tree.links.new(n.outputs['Fac'], bump.inputs['Height'])
        m.node_tree.links.new(bump.outputs['Normal'], p.inputs['Normal'])
    return m


SKIN = material('肌・温かいライトベージュ', (.48, .29, .19), roughness=.52, noise=True)
SKIN.node_tree.nodes['Principled BSDF'].inputs['Subsurface Weight'].default_value = .09
BLACK = material('ジャケット・黒のウール', (.009, .013, .019), roughness=.72, noise=True)
PANTS = material('パンツ・黒のツイル', (.007, .011, .017), roughness=.75, noise=True)
WHITE = material('白の生地', (.70, .74, .77), roughness=.56, noise=True)
LEATHER = material('黒の磨いたローファー', (.007, .008, .010), roughness=.22)
SOLE = material('靴底', (.004, .005, .007), roughness=.55)
GOLD = material('真鍮の装飾', (.64, .38, .08), metallic=.83, roughness=.25)
SILVER = material('シルバーの鋲', (.58, .63, .67), metallic=.85, roughness=.22)
LIPS = material('唇', (.30, .09, .075), roughness=.47)


def smooth(obj):
    if obj.type == 'MESH':
        for p in obj.data.polygons:
            p.use_smooth = True
    return obj


def mesh_obj(name, verts, faces, mat):
    data = bpy.data.meshes.new(name)
    data.from_pydata(verts, [], faces)
    data.update()
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    smooth(obj)
    return obj


def curve(name, points, radius, mat):
    c = bpy.data.curves.new(name, 'CURVE')
    c.dimensions = '3D'
    c.resolution_u = 16
    c.bevel_depth = radius
    c.bevel_resolution = 3
    s = c.splines.new('BEZIER')
    s.bezier_points.add(len(points)-1)
    for p, co in zip(s.bezier_points, points):
        p.co = co
        p.handle_left_type = 'AUTO'
        p.handle_right_type = 'AUTO'
    o = bpy.data.objects.new(name, c)
    bpy.context.collection.objects.link(o)
    o.data.materials.append(mat)
    return o


def ellipsoid(name, pos, scale, mat, segments=32, rings=20):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=pos)
    o = bpy.context.object
    o.name = name
    o.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.data.materials.append(mat)
    smooth(o)
    return o


# 元の頂点番号を保ち、変形・関節・ウェイトを同じ座標へ適用する。
vertices, faces = [], []
group = ''
for line in (SOURCE / 'base.obj').read_text().splitlines():
    words = line.split()
    if not words:
        continue
    if words[0] == 'v':
        vertices.append(Vector(tuple(map(float, words[1:4]))))
    elif words[0] == 'g':
        group = words[1]
    elif words[0] == 'f' and group == 'body':
        faces.append([int(w.split('/')[0])-1 for w in words[1:]])
for name, factor in [('male-young.target', 1.0), ('slim.target', .36)]:
    for line in (SOURCE / name).read_text().splitlines():
        if not line or line.startswith('#'):
            continue
        i, *delta = line.split()
        vertices[int(i)] += Vector(tuple(map(float, delta))) * factor
floor = min(v.y for v in vertices)
vertices = [Vector((v.x*.1, -v.z*.1, (v.y-floor)*.1)) for v in vertices]

body = mesh_obj('人体・CC0 MakeHuman', vertices, faces, SKIN)
body.data.materials.append(LIPS)
# 口の表面だけに控えめな血色をつける。

spec = json.loads((SOURCE / 'default.mhskel').read_text())
weights = json.loads((SOURCE / 'default_weights.mhw').read_text())['weights']
joints = {name: sum((vertices[i] for i in ids), Vector()) / len(ids)
          for name, ids in spec['joints'].items()}
arm_data = bpy.data.armatures.new('舞台キャラクター骨格')
rig = bpy.data.objects.new('舞台キャラクター骨格', arm_data)
bpy.context.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig
rig.select_set(True)
body.select_set(False)
bpy.ops.object.mode_set(mode='EDIT')
for name, props in spec['bones'].items():
    b = arm_data.edit_bones.new(name)
    b.head, b.tail = joints[props['head']], joints[props['tail']]
for name, props in spec['bones'].items():
    if props['parent']:
        arm_data.edit_bones[name].parent = arm_data.edit_bones[props['parent']]
bpy.ops.object.mode_set(mode='OBJECT')
for name, entries in weights.items():
    vg = body.vertex_groups.new(name=name)
    for index, weight in entries:
        vg.add([index], weight, 'REPLACE')
mod = body.modifiers.new('骨格', 'ARMATURE')
mod.object = rig
mod.use_deform_preserve_volume = True


def aim(name, direction):
    pb = rig.pose.bones[name]
    rest = rig.data.bones[name]
    q = (rest.tail_local-rest.head_local).rotation_difference(Vector(direction))
    loc = pb.head.copy()
    orient = q.to_matrix().to_4x4() @ rest.matrix_local.to_3x3().to_4x4()
    orient.translation = loc
    pb.matrix = orient
    bpy.context.view_layer.update()


# 腕を下ろし、重心のある広めの立ち姿にする。
for side, sign in [('L', 1), ('R', -1)]:
    for part in ['upperarm01', 'upperarm02']:
        aim(part+'.'+side, (sign*.20, -.01, -1))
    for part in ['lowerarm01', 'lowerarm02']:
        aim(part+'.'+side, (sign*.12, -.13, -1))
    aim('wrist.'+side, (sign*.10, -.04, -1))
    for part in ['upperleg01', 'upperleg02']:
        aim(part+'.'+side, (sign*.24, .01, -1))
    for part in ['lowerleg01', 'lowerleg02']:
        aim(part+'.'+side, (sign*.20, 0, -1))
    # 指を巻いて、リラックスした拳へ。
    for number in range(2, 6):
        for section in range(1, 4):
            direction = {1:(0,.95,-.30),2:(0,.1,1),3:(0,-.95,.1)}[section]
            aim(f'finger{number}-{section}.{side}', direction)
    for section in [1, 2, 3]:
        aim(f'finger1-{section}.{side}',(-sign*.15,.9,-.35))
bpy.context.view_layer.update()

# 静止姿を基準姿勢として固定し、同じ骨格を以後の動きに使えるようにする。
bpy.context.view_layer.objects.active = body
bpy.ops.object.modifier_apply(modifier=mod.name)
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode='POSE')
bpy.ops.pose.armature_apply(selected=False)
bpy.ops.object.mode_set(mode='OBJECT')
mod = body.modifiers.new('骨格', 'ARMATURE')
mod.object = rig
mod.use_deform_preserve_volume = True

# 靴で覆う足の肌は描画せず、つま先が靴から突き出すのを防ぐ。
bm=bmesh.new()
bm.from_mesh(body.data)
bmesh.ops.delete(bm,geom=[f for f in bm.faces if f.calc_center_median().z < .14],context='FACES_ONLY')
bm.to_mesh(body.data)
bm.free()
body.data.update()

# 全身のうち手・頭・足は肌のまま。衣服は人体と別の厚みを持ったメッシュ。
hand_group_ids = {vg.index for vg in body.vertex_groups
                  if any(s in vg.name for s in ['finger', 'metacarpal', 'wrist'])}
arm_group_ids = {vg.index for vg in body.vertex_groups
                 if any(s in vg.name for s in ['upperarm', 'lowerarm'])}
cloth_faces, cloth_indices = [], set()
for p in body.data.polygons:
    center = sum((body.data.vertices[i].co for i in p.vertices), Vector()) / len(p.vertices)
    hand_w = sum(sum(g.weight for g in body.data.vertices[i].groups if g.group in hand_group_ids)
                 for i in p.vertices)/len(p.vertices)
    arm_w = sum(sum(g.weight for g in body.data.vertices[i].groups if g.group in arm_group_ids)
                for i in p.vertices)/len(p.vertices)
    if ((arm_w > .25 and .89 < center.z < 1.535) or (1.43 < center.z < 1.535)) and hand_w < .30:
        cloth_faces.append(list(p.vertices))
        cloth_indices.update(p.vertices)
cloth_vertices = [v.co.copy() for v in body.data.vertices]
for i in cloth_indices:
    v = body.data.vertices[i]
    normal = v.normal.copy()
    amount = .011 if v.co.z > .98 else .014
    cloth_vertices[i] += normal*amount
clothing = mesh_obj('黒いジャケットとパンツ', cloth_vertices, cloth_faces, BLACK)
clothing.data.materials.append(PANTS)
clothing.data.materials.append(WHITE)
for p in clothing.data.polygons:
    center = sum((clothing.data.vertices[i].co for i in p.vertices), Vector())/len(p.vertices)
    if center.z < .98:
        p.material_index = 1
    if center.x < -.20 and .91 < center.z < 1.12:
        p.material_index = 2
solid = clothing.modifiers.new('生地の厚み', 'SOLIDIFY')
solid.thickness = .004
sub = clothing.modifiers.new('滑らかな生地', 'SUBSURF')
sub.levels = 1
sub.render_levels = 2

# 肌は服の内側に隠れる。すその下には白靴下と黒いローファー。
pant_legs=[]
for side, sign in [('L', 1), ('R', -1)]:
    ankle = rig.data.bones['foot.'+side].head_local.copy()
    x = ankle.x
    # 立ち位置に応じて靴とソックスの底を揃える。
    ellipsoid('白ソックス・'+side, (x, ankle.y, .112), (.041, .046, .069), WHITE)
    shoe = ellipsoid('ローファー・'+side, (x, ankle.y-.052, .043), (.055, .115, .039), LEATHER)
    sole = ellipsoid('靴底・'+side, (x, ankle.y-.051, .020), (.056, .119, .013), SOLE)
    shoe.rotation_euler.z = math.radians(-sign*9)
    sole.rotation_euler.z = shoe.rotation_euler.z
    curve('ローファーの甲・'+side,
          [(x-.045, ankle.y-.077, .066), (x, ankle.y-.079, .080), (x+.045, ankle.y-.077, .066)],
          .004, LEATHER)

    # すとんと落ちるパンツ。膝と足首を結び、脚の筋肉を布で包む。
    knee=rig.data.bones['lowerleg01.'+side].head_local.copy()
    hip=rig.data.bones['upperleg01.'+side].head_local.copy()
    sections=[(1.01,.089,.106),(.89,.086,.103),(.71,.078,.095),
              (.54,.070,.083),(.36,.061,.071),(.17,.050,.057)]
    v=[]
    body_ids={i for f in faces for i in f}
    for z,rx,ry in sections:
        if z>knee.z:
            t=max(0,min(1,(z-knee.z)/(hip.z-knee.z)))
            center=knee.lerp(hip,t)
        else:
            t=max(0,min(1,(z-ankle.z)/(knee.z-ankle.z)))
            center=ankle.lerp(knee,t)
        points=[body.data.vertices[i].co for i in body_ids
                if abs(body.data.vertices[i].co.z-z)<.035
                and abs(body.data.vertices[i].co.x-center.x)<.115]
        if points:
            miny,maxy=min(p.y for p in points),max(p.y for p in points)
            center.y=(miny+maxy)*.5
            ry=max(ry,(maxy-miny)*.5+.014)
        for k in range(48):
            a=2*math.pi*k/48
            if z==sections[0][0]:
                # 上端を左右それぞれ半分のウエストへつなぎ、股上の縫い目を共有する。
                x=.180*math.cos(a) if sign*math.cos(a)>0 else 0
                v.append((x,.004+.143*math.sin(a),z))
            else:
                v.append((center.x+rx*math.cos(a),center.y+ry*math.sin(a),z))
    leg=mesh_obj('仕立てたストレートパンツ・'+side,v,
                 [(j*48+k,j*48+(k+1)%48,(j+1)*48+(k+1)%48,(j+1)*48+k)
                  for j in range(len(sections)-1) for k in range(48)],PANTS)
    leg.modifiers.new('パンツの厚み','SOLIDIFY').thickness=.003
    sub=leg.modifiers.new('滑らかな裁断','SUBSURF');sub.levels=2
    pant_legs.append(leg)

# 二本の脚の股上を結合し、独立した塊に見える境目をなくす。
bpy.ops.object.select_all(action='DESELECT')
for leg in pant_legs:
    leg.select_set(True)
bpy.context.view_layer.objects.active=pant_legs[0]
bpy.ops.object.join()
pants=bpy.context.object
pants.name='一続きの仕立てたパンツ'
bm=bmesh.new();bm.from_mesh(pants.data)
bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.0001)
bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
bm.to_mesh(pants.data);bm.free();pants.data.update()

# 白いインナー。胸元をV字のジャケットに見せるための独立した布。
shirt = mesh_obj('白いインナー',
                 [(-.057,-.092,1.516),(.057,-.092,1.516),(.050,-.144,1.445),(0,-.154,1.385),(-.050,-.144,1.445)],
                 [(0,1,2,3,4)], WHITE)
sol = shirt.modifiers.new('シャツの厚み','SOLIDIFY')
sol.thickness = .003

# 腕の金リボン・白い右腕カフに立体の鋲を添える。
for sign, side in [(1,'L'),(-1,'R')]:
    elbow = rig.data.bones['lowerarm01.'+side].head_local
    upper = rig.data.bones['upperarm01.'+side].head_local
    p = upper.lerp(elbow,.50)
    # 腕を一周する楕円形のバンド。
    axis = (elbow-upper).normalized()
    bx = Vector((1,0,0))
    bx = (bx-axis*bx.dot(axis)).normalized()
    by = axis.cross(bx).normalized()
    verts=[]
    for t in [-.009,.009]:
        for k in range(64):
            a=2*math.pi*k/64
            verts.append(p+axis*t+bx*(.056*math.cos(a))+by*(.058*math.sin(a)))
    band=mesh_obj('金の腕章・'+side,verts,[(i,(i+1)%64,(i+1)%64+64,i+64) for i in range(64)],GOLD)
    band.modifiers.new('金属の厚み','SOLIDIFY').thickness=.002

# 後で同じ骨格に追従できるよう、衣服へ人体ウェイトを引き継ぐ。
for vg in body.vertex_groups:
    clothing.vertex_groups.new(name=vg.name)
for v in body.data.vertices:
    for g in v.groups:
        clothing.vertex_groups[g.group].add([v.index],g.weight,'REPLACE')
mod = clothing.modifiers.new('骨格', 'ARMATURE')
mod.object = rig

if (ROOT/'stage_uniform.py').exists():
    from stage_uniform import build_stage_uniform
    bpy.data.objects.remove(shirt,do_unlink=True)
    build_stage_uniform()
else:
    print('STAGE_UNIFORM_PENDING')
head_objects=[]
if (ROOT/'head_details.py').exists():
    # 衣装の後面に沿って、長い後ろ髪を配置する。
    bpy.context.view_layer.update()
    from head_details import build_head_details
    head_objects=build_head_details(head_center=(0,-.058,1.706),top_z=1.795,
                                    front_y=-.174,head_width=.171,eye_z=1.675)
else:
    print('HEAD_DETAILS_PENDING')

# 足の肌の露出は衣服と靴で隠し、補助メッシュは一切描画しない。
bm=bmesh.new()
bm.from_mesh(body.data)
deform=bm.verts.layers.deform.active
covered=[]
for f in bm.faces:
    hand_w=sum(sum(w for group,w in v[deform].items() if group in hand_group_ids) for v in f.verts)/len(f.verts)
    if f.calc_center_median().z < 1.529 and hand_w < .15:
        covered.append(f)
bmesh.ops.delete(bm,geom=covered,context='FACES_ONLY')
bm.to_mesh(body.data)
bm.free()
body.data.update()
sub = body.modifiers.new('肌の滑らかさ','SUBSURF')
sub.levels=1
sub.render_levels=2

FLOOR=material('舞台・マットチャコール',(.016,.023,.035),roughness=.5)
bpy.ops.mesh.primitive_cylinder_add(vertices=128,radius=.73,depth=.025,location=(0,0,-.016))
stage=bpy.context.object
stage.name='円形ステージ'
stage.data.materials.append(FLOOR)
bevel=stage.modifiers.new('舞台のエッジ','BEVEL')
bevel.width=.015
bevel.segments=3
smooth(stage)
bpy.ops.mesh.primitive_plane_add(size=200, location=(0,0,-.03))
bpy.context.object.name='スタジオ床'
bpy.context.object.data.materials.append(FLOOR)


def area(name, pos, energy, size, color, target=(0,0,1)):
    bpy.ops.object.light_add(type='AREA',location=pos)
    o=bpy.context.object
    o.name=name
    o.data.energy=energy
    o.data.shape='DISK'
    o.data.size=size
    o.data.color=color
    o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
    return o


area('キー・大きなソフトボックス',(-2.5,-3.5,3.8),380,3.0,(1,.87,.73))
area('青いフィル',(2.3,-1.6,2.0),180,2.7,(.64,.77,1))
area('背面のリム',(1.0,2.0,3.2),300,2,(.8,.87,1))
area('正面のレフ',(0,-3,1.6),75,2,(1,1,1))
scene=bpy.context.scene
scene.world.color=(.035,.035,.035)
scene.render.engine='BLENDER_EEVEE_NEXT' if '--eevee' in sys.argv else 'CYCLES'
scene.cycles.samples=20 if DRAFT else 96
scene.cycles.use_denoising=False
scene.cycles.use_adaptive_sampling=True
scene.cycles.adaptive_threshold=.045
scene.cycles.adaptive_min_samples=16
scene.cycles.max_bounces=6
scene.render.resolution_x=480 if DRAFT else 768
scene.render.resolution_y=640 if DRAFT else 1024
scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.view_settings.view_transform='AgX'
scene.view_settings.look='AgX - Medium High Contrast'
scene.render.film_transparent=False
scene.render.threads_mode='FIXED'
scene.render.threads=6
bpy.ops.object.camera_add()
camera=bpy.context.object
camera.name='見本用カメラ'
camera.data.type='ORTHO'
camera.data.lens=70
camera.data.ortho_scale=2.17
scene.camera=camera
views={'front':((0,-4.5,1.04),(0,0,.89),2.17),
       'side':((4.5,0,1.05),(0,0,.89),2.17),
       'back':((0,4.5,1.04),(0,0,.89),2.17),
       'portrait':((.38,-3,1.73),(0,-.015,1.53),.74)}
(ROOT/'renders').mkdir(exist_ok=True)
camera.location=views['front'][0]
camera.rotation_euler=(Vector(views['front'][1])-camera.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'stage-character.blend'))
if '--model-only' in sys.argv:
    sys.exit(0)
for name,(pos,target,scale) in views.items():
    if ONLY and name != ONLY:
        continue
    camera.location=pos
    camera.rotation_euler=(Vector(target)-camera.location).to_track_quat('-Z','Y').to_euler()
    camera.data.ortho_scale=scale
    scene.render.filepath=str(ROOT/'renders'/f'{name}.png')
    bpy.ops.render.render(write_still=True)
    print('RENDERED',name,flush=True)
print('CHARACTER_COMPLETE',flush=True)
