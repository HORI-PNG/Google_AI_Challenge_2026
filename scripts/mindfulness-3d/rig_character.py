"""承認済みの舞台モデルを、アニメーション用の軽いスキンへまとめる。

元の blend は読み込み済みであること。保存・アニメーション作成・export は
この module の責務に含めない。全ての変更は現在の作業 scene のみに行う。
"""
from pathlib import Path
from collections import defaultdict
import math

import bpy
import bmesh
from mathutils import Vector
from mathutils.kdtree import KDTree


ROOT = Path(__file__).resolve().parent
RIG_NAME = '舞台キャラクター骨格'
BODY_NAME = '人体・CC0 MakeHuman'

# 腕に近い胸側面を nearest で腕へ誤結合しないよう、独立した胴衣装を固定。
# 接尾辞 .001 等を含む、Blender の同名パーツにも適用する。
SPINE_PART_PREFIXES = (
    '仕立てたジャケットの胴', '見える白シャツ', '立った黒の襟',
    '襟のステッチ', '金のクロスベルトの基部', '金の装飾の連続バー',
    '帯の縁の金具', '金帯のパイピング', '背中の金帯',
    '背中のベルトの金属', '黒の肩章', '肩章の金線',
)
ROOT_PART_PREFIXES = (
    '腰のゴールドベルト', 'ベルトの留め金', '留め金の光沢', 'ベルトの細い装飾',
)


def _active(obj):
    """operator に必要な選択を一つに限定する。"""
    if bpy.context.object and bpy.context.object.mode != 'OBJECT':
        bpy.ops.object.mode_set(mode='OBJECT')
    bpy.ops.object.select_all(action='DESELECT')
    obj.hide_set(False)
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj


def _triangles(mesh):
    return sum(max(0, len(p.vertices)-2) for p in mesh.polygons)


def _statistics(objects, evaluated=False):
    """元 scene と軽量化後の規模を同じ基準で比較する。"""
    vertices = triangles = 0
    materials = set()
    depsgraph = bpy.context.evaluated_depsgraph_get() if evaluated else None
    for obj in objects:
        evaluated_obj = obj.evaluated_get(depsgraph) if evaluated else None
        mesh = evaluated_obj.to_mesh() if evaluated else obj.data
        if mesh is None:
            continue
        vertices += len(mesh.vertices)
        triangles += _triangles(mesh)
        materials.update(m.as_pointer() for m in mesh.materials if m)
        if evaluated_obj:
            evaluated_obj.to_mesh_clear()
    return {'objects': len(objects), 'vertices': vertices,
            'triangles': triangles, 'materials': len(materials)}


def _source_body_indices():
    """helper の近傍を誤参照しないよう、OBJ の body 面だけを拾う。"""
    indices = set()
    group = ''
    for line in (ROOT/'source'/'base.obj').read_text().splitlines():
        if line.startswith('g '):
            group = line[2:].strip()
        elif group == 'body' and line.startswith('f '):
            indices.update(int(p.split('/')[0])-1 for p in line.split()[1:])
    return sorted(indices)


def _weight_source(body, rig):
    """全身の元頂点順序を保持している段階で KDTree と重みを保存する。"""
    indices = _source_body_indices()
    if len(body.data.vertices) != 19158:
        raise ValueError('人体の元頂点順序が変わっています。承認済み blend から開始してください。')
    group_names = {g.index: g.name for g in body.vertex_groups
                   if g.name in rig.data.bones}
    weights = {}
    tree = KDTree(len(indices))
    for slot, index in enumerate(indices):
        vert = body.data.vertices[index]
        tree.insert(body.matrix_world @ vert.co, index)
        weights[index] = {group_names[g.group]: g.weight for g in vert.groups
                          if g.group in group_names and g.weight > 1e-7}
    tree.balance()
    return tree, weights


def _thin_poly_hair(obj):
    """主要な巻き毛の輪郭を残し、微小な中心線のサンプルだけ減らす。"""
    old = obj.data
    if not old.splines or not all(s.type == 'POLY' for s in old.splines):
        old.bevel_resolution = 0
        return
    new = bpy.data.curves.new(old.name+'_軽量版', 'CURVE')
    new.dimensions = '3D'
    new.bevel_depth = old.bevel_depth
    new.bevel_resolution = 0
    new.use_fill_caps = old.use_fill_caps
    new.fill_mode = old.fill_mode
    new.resolution_u = 1
    for mat in old.materials:
        new.materials.append(mat)
    for src in old.splines:
        count = len(src.points)
        chosen = list(range(0, count, 2))
        if not src.use_cyclic_u and chosen[-1] != count-1:
            chosen.append(count-1)
        dst = new.splines.new('POLY')
        dst.points.add(len(chosen)-1)
        dst.use_cyclic_u = src.use_cyclic_u
        dst.material_index = src.material_index
        for p, i in zip(dst.points, chosen):
            p.co = src.points[i].co
            p.radius = src.points[i].radius
            p.tilt = src.points[i].tilt
    obj.data = new
    if not old.users:
        bpy.data.curves.remove(old)


def _meshify(obj):
    """スキン以外の modifier を固定し、curve を軽い mesh にする。"""
    _active(obj)
    for mod in obj.modifiers:
        if mod.type == 'SUBSURF':
            mod.levels = min(mod.levels, 1)
            mod.render_levels = min(mod.render_levels, 1)
        elif mod.type == 'BEVEL':
            # 幅3mm以下の金具は一段の面取りでも舞台サイズでは滑らか。
            mod.segments = min(mod.segments, 1 if mod.width <= .003 else 2)
    if obj.type == 'CURVE':
        if obj.name.startswith('MJ_Hair'):
            _thin_poly_hair(obj)
        else:
            obj.data.bevel_resolution = min(obj.data.bevel_resolution,
                                            2 if obj.name.startswith('MJ_Aviator') else 1)
        # 現在の曲線は全て未リグ。convert が曲線の modifier も適用する。
        bpy.ops.object.convert(target='MESH')
        obj = bpy.context.object
    # 元 armature は適用しない。SUBSURF は既存のウェイトを補間する。
    armatures = [(m, m.show_viewport, m.show_render) for m in obj.modifiers
                 if m.type == 'ARMATURE']
    for mod, _, _ in armatures:
        mod.show_viewport = False
        mod.show_render = False
        # ARMATURE を後ろへ避け、非スキンmodifierだけを先頭から適用する。
        # これにより非先頭modifier適用の警告・曖昧な評価順を避ける。
        while obj.modifiers.find(mod.name) < len(obj.modifiers)-1:
            bpy.ops.object.modifier_move_down(modifier=mod.name)
    for mod in list(obj.modifiers):
        if mod.type != 'ARMATURE':
            bpy.ops.object.modifier_apply(modifier=mod.name)
    for mod, viewport, render in armatures:
        mod.show_viewport = viewport
        mod.show_render = render
    return obj


def _set_weights(obj, rig, tree, source, rigid_bone=None):
    """最近傍3点の逆距離補間。各頂点は最大4本の骨へ正規化する。"""
    obj.vertex_groups.clear()
    group_names = [rigid_bone] if rigid_bone else list(rig.data.bones.keys())
    groups = {n: obj.vertex_groups.new(name=n) for n in group_names}
    for vert in obj.data.vertices:
        if rigid_bone:
            groups[rigid_bone].add([vert.index], 1., 'REPLACE')
            continue
        nearest = tree.find_n(obj.matrix_world @ vert.co, 3)
        if nearest[0][2] < 1e-7:
            blend = source[nearest[0][1]].copy()
        else:
            blend = defaultdict(float)
            for _, index, distance in nearest:
                factor = 1./max(distance, 1e-7)
                for name, value in source[index].items():
                    blend[name] += value*factor
        strongest = sorted(blend.items(), key=lambda p:p[1], reverse=True)[:4]
        total = sum(weight for _, weight in strongest)
        if total < 1e-10:
            raise ValueError(f'ウェイトの無い近傍があります: {obj.name} / {vert.index}')
        for name, value in strongest:
            groups[name].add([vert.index], value/total, 'REPLACE')
    for mod in list(obj.modifiers):
        if mod.type == 'ARMATURE':
            obj.modifiers.remove(mod)
    mod = obj.modifiers.new('舞台キャラクターのスキン', 'ARMATURE')
    mod.object = rig
    mod.use_deform_preserve_volume = True


def _remove_loose(mesh):
    """顔・手を切り出した人体に残る、未使用の全身頂点を削除する。"""
    bm = bmesh.new()
    bm.from_mesh(mesh)
    unused = [v for v in bm.verts if not v.link_faces]
    bmesh.ops.delete(bm, geom=unused, context='VERTS')
    bm.to_mesh(mesh)
    bm.free()
    mesh.update()


def _merge_material_slots(obj):
    """同じ material datablock を一つの slot に集約する。"""
    old = list(obj.data.materials)
    unique = []
    indices = {}
    for mat in old:
        key = mat.as_pointer() if mat else None
        if key not in indices:
            indices[key] = len(unique)
            unique.append(mat)
    face_indices = [indices[old[p.material_index].as_pointer()
                            if old[p.material_index] else None]
                    for p in obj.data.polygons]
    obj.data.materials.clear()
    for mat in unique:
        obj.data.materials.append(mat)
    for polygon, index in zip(obj.data.polygons, face_indices):
        polygon.material_index = index


def _normalize_four_weights(obj):
    """glTF と Blender の結果を揃え、人体も含め上位4本へ正規化する。"""
    for vertex in obj.data.vertices:
        entries=[(g.group,g.weight) for g in vertex.groups]
        strongest=sorted(((group,weight) for group,weight in entries
                          if weight>1e-8),key=lambda item:item[1],reverse=True)[:4]
        total=sum(weight for _,weight in strongest)
        if total<=0:
            raise ValueError(f'描画頂点に有効なウェイトがありません: {vertex.index}')
        keep={group for group,_ in strongest}
        if len(entries)<=4 and len(entries)==len(strongest) and abs(total-1.)<1e-7:
            continue
        for group,_ in entries:
            if group not in keep:
                obj.vertex_groups[group].remove([vertex.index])
        for group,weight in strongest:
            obj.vertex_groups[group].add([vertex.index],weight/total,'REPLACE')


def _microphone(rig):
    """右拳で持つ16cmのマイク。実際の細い金属グリルを備える。"""
    wrist = rig.data.bones['wrist.R']
    axis = (rig.matrix_world.to_3x3() @ (wrist.tail_local-wrist.head_local)).normalized()
    hold = rig.matrix_world @ (wrist.head_local+(wrist.tail_local-wrist.head_local).normalized()*.080)
    # グリル側を拳の先へ向け、腕を上げたときに口元へ来るようにする。
    axis = -axis
    u = axis.orthogonal().normalized()
    v = axis.cross(u).normalized()
    verts, faces, material_indices = [], [], []

    def location(s, radius, angle):
        return hold+axis*s+(u*math.cos(angle)+v*math.sin(angle))*radius

    def surface(rings, material, segments=24):
        start = len(verts)
        for s, r in rings:
            verts.extend(location(s,r,math.tau*j/segments) for j in range(segments))
        for i in range(len(rings)-1):
            for j in range(segments):
                a=start+i*segments+j
                b=start+i*segments+(j+1)%segments
                faces.append((a,b,b+segments,a+segments))
                material_indices.append(material)
        faces.append(tuple(start+j for j in reversed(range(segments))))
        material_indices.append(material)
        end=start+(len(rings)-1)*segments
        faces.append(tuple(end+j for j in range(segments)))
        material_indices.append(material)

    def thin_tube(points, radius, material, cyclic=False):
        start=len(verts)
        for i,p in enumerate(points):
            tangent=(points[(i+1)%len(points)]-points[i-1]).normalized() if cyclic else (
                points[min(len(points)-1,i+1)]-points[max(0,i-1)]).normalized()
            across=tangent.orthogonal().normalized()
            other=tangent.cross(across).normalized()
            for j in range(4):
                a=math.tau*j/4
                verts.append(p+(across*math.cos(a)+other*math.sin(a))*radius)
        for i in range(len(points) if cyclic else len(points)-1):
            a=start+i*4
            b=start+((i+1)%len(points))*4
            for j in range(4):
                faces.append((a+j,a+(j+1)%4,b+(j+1)%4,b+j))
                material_indices.append(material)

    surface([(-.085,.0088),(-.079,.0088),(.033,.0072),(.040,.0069)],0)
    surface([(-.088,.0093),(-.083,.0093),(-.081,.0084)],1)
    profile=[(-.120,.001),(-.118,.007),(-.114,.012),(-.109,.0148),
             (-.103,.0155),(-.096,.0143),(-.090,.0117),(-.087,.0087)]
    surface(profile,2)
    for j in range(20):
        a=math.tau*j/20
        points=[location(s,r+.00035,a) for s,r in profile]
        thin_tube(points,.00032,1)
    for s,r in profile[1:-1]:
        thin_tube([location(s,r+.00035,math.tau*j/32) for j in range(32)],.00032,1,True)
    mesh=bpy.data.meshes.new('StageMicrophoneGeometry')
    mesh.from_pydata(verts,[],faces)
    mesh.update()
    obj=bpy.data.objects.new('StageMicrophone',mesh)
    bpy.context.scene.collection.objects.link(obj)
    for name,color,metal,rough in [
            ('マイク・黒いハンドル',(.012,.015,.020),.35,.32),
            ('マイク・銀のグリル',(.32,.36,.40),.83,.3),
            ('マイク・グリルの黒い内側',(.006,.008,.011),.1,.65)]:
        mat=bpy.data.materials.get(name) or bpy.data.materials.new(name)
        mat.use_nodes=True
        shader=mat.node_tree.nodes.get('Principled BSDF')
        shader.inputs['Base Color'].default_value=(*color,1)
        shader.inputs['Metallic'].default_value=metal
        shader.inputs['Roughness'].default_value=rough
        mesh.materials.append(mat)
    for p,index in zip(mesh.polygons,material_indices):
        p.material_index=index
        p.use_smooth=True
    group=obj.vertex_groups.new(name='wrist.R')
    group.add(list(range(len(mesh.vertices))),1.,'REPLACE')
    mod=obj.modifiers.new('右手のマイク', 'ARMATURE')
    mod.object=rig
    obj['hold_axis_local_bone']='wrist.R / +Y'
    obj['length_m']=.16
    obj.hide_render=False
    obj.hide_viewport=False
    return obj


def prepare_character():
    """骨格・結合済み人物・マイク・左右の靴底world頂点を返す。"""
    rig=bpy.data.objects.get(RIG_NAME)
    body=bpy.data.objects.get(BODY_NAME)
    if rig is None or body is None:
        raise ValueError('承認済み stage-character.blend を先に読み込んでください。')
    if rig.get('renote_character_prepared'):
        raise ValueError('このsceneでは既に統合済みです。元のblendを再読込してください。')
    excluded={'円形ステージ','スタジオ床','StageMicrophone'}
    candidates=[o for o in bpy.context.scene.objects
                if o.type in {'MESH','CURVE','SURFACE','FONT'} and
                o.name not in excluded and not o.hide_render]
    before=_statistics(candidates,evaluated=True)
    print('CHARACTER_BEFORE',before,flush=True)
    tree,source=_weight_source(body,rig)
    foot_refs={side:[o.matrix_world@vert.co for vert in o.data.vertices]
               for side in ('L','R')
               for o in [bpy.data.objects['靴底・'+side]]}
    merged=[]
    # 微細な補助毛はスマホの描画コストに見合わないため、この作業sceneのみ除外。
    omitted=[]
    for obj in candidates:
        if obj.name.startswith(('MJ_Hair_SurfaceFibres','MJ_Hair_NapeFineStrands')):
            omitted.append(obj.name)
            bpy.data.objects.remove(obj,do_unlink=True)
            continue
        obj=_meshify(obj)
        # 袖と上肩capを持つ元ジャケットは、元の人体スキンを維持する。
        if obj != body and not obj.name.startswith('黒いジャケットとパンツ'):
            rigid=None
            if obj.name.startswith(('MJ_Hair','MJ_Aviator')):
                rigid='head'
            elif obj.name.startswith(('白ソックス・','ローファー・','靴底・','ローファーの甲・')):
                side=obj.name.split('・')[-1].split('.')[0]
                rigid='foot.'+side
            elif obj.name.startswith('金の腕章・'):
                side=obj.name.split('・')[-1].split('.')[0]
                rigid='upperarm02.'+side
            elif obj.name.startswith(SPINE_PART_PREFIXES):
                rigid='spine01'
            elif obj.name.startswith(ROOT_PART_PREFIXES):
                rigid='root'
            _set_weights(obj,rig,tree,source,rigid)
        merged.append(obj)
    prepared=_statistics(merged)
    print('CHARACTER_PREJOIN',prepared,'omitted',omitted,flush=True)
    _active(body)
    for obj in merged:
        obj.select_set(True)
    bpy.context.view_layer.objects.active=body
    bpy.ops.object.join()
    character=bpy.context.object
    character.name='StageCharacter'
    character.data.name='StageCharacterGeometry'
    _remove_loose(character.data)
    _merge_material_slots(character)
    # 公式元ウェイトは最大12本・和が1でない箇所もある。最終出力だけ統一。
    _normalize_four_weights(character)
    microphone=_microphone(rig)
    after=_statistics([character])
    microphone_stats=_statistics([microphone])
    # 圧縮なしGLBの概算。実際はnormal/UV境界・animationで増減する。
    estimated=(after['vertices']*56+after['triangles']*12+
               after['materials']*2048+microphone_stats['vertices']*56+
               microphone_stats['triangles']*12)/1_000_000
    stats={'before':before,'prejoin':prepared,'after':after,
           'microphone':microphone_stats,'estimated_glb_geometry_mb':round(estimated,2)}
    rig['renote_character_prepared']=True
    character['renote_geometry_stats']=str(stats)
    prepare_character.last_stats=stats
    print('CHARACTER_AFTER',after,flush=True)
    print('MICROPHONE_STATS',microphone_stats,flush=True)
    print('ESTIMATED_GEOMETRY_GLB_MB',round(estimated,2),flush=True)
    return rig,character,microphone,foot_refs
