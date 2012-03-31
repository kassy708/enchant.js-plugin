/**
* PhySprite.enchant.js
* @version 1.52
* @require enchant.js v0.4.3 or later
* @require Box2dWeb.js
* @author kassy708 http://twitter.com/kassy708
*
* @description
* 物理演算用のSprite
* このプラグインではBox2dWeb.jsを用いています。
* 最新のBox2dWeb.jsは下記アドレスからダウンロードしてください。
* http://www.gphysics.com/
*
* @license
* The MIT License
* Copyright (c) 2012/01/26 kassy708
*
* Permission is hereby granted, free of charge, to any person obtaining a copy
* of this software and associated documentation files (the "Software"), to deal
* in the Software without restriction, including without limitation the rights
* to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
* copies of the Software, and to permit persons to whom the Software is
* furnished to do so, subject to the following conditions:
*
* The above copyright notice and this permission notice shall be included in
* all copies or substantial portions of the Software.
*
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
* IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
* FITNESS FOR A PARTICULAR PURPOSE AND NON-INFRINGEMENT. IN NO EVENT SHALL THE
* AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
* LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
* OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
* THE SOFTWARE.
*/

/**
* 長さの単位,pxとmの大きさの比率
*/
var WORLD_SCALE = 32;
/**
* 物理ワールド
*/
var world = null;

/**
* スプライトの輪郭の色
*/
var DebugDrawStrokeColor = 'black';
/**
* スプライトの塗りつぶしの色
*/
var DebugDrawFillColor = 'white';
/**
* ジョイントの色
*/
var DrawJointColor = '#00eeee';



var b2Vec2 = Box2D.Common.Math.b2Vec2
, b2AABB = Box2D.Collision.b2AABB
, b2BodyDef = Box2D.Dynamics.b2BodyDef
, b2Body = Box2D.Dynamics.b2Body
, b2FixtureDef = Box2D.Dynamics.b2FixtureDef
, b2Fixture = Box2D.Dynamics.b2Fixture
, b2World = Box2D.Dynamics.b2World
, b2MassData = Box2D.Collision.Shapes.b2MassData
, b2PolygonShape = Box2D.Collision.Shapes.b2PolygonShape
, b2CircleShape = Box2D.Collision.Shapes.b2CircleShape
, b2Shape = Box2D.Collision.Shapes.b2Shape
, b2DebugDraw = Box2D.Dynamics.b2DebugDraw
, b2MouseJointDef = Box2D.Dynamics.Joints.b2MouseJointDef
, b2Math = Box2D.Common.Math.b2Math
, b2Joint = Box2D.Dynamics.Joints.b2Joint
, b2DistanceJointDef = Box2D.Dynamics.Joints.b2DistanceJointDef
, b2RevoluteJointDef = Box2D.Dynamics.Joints.b2RevoluteJointDef
, b2PulleyJointDef = Box2D.Dynamics.Joints.b2PulleyJointDef
, b2PrismaticJointDef = Box2D.Dynamics.Joints.b2PrismaticJointDef
, b2GearJointDef = Box2D.Dynamics.Joints.b2GearJointDef
;


/**
* Spriteの種類（スタティック）
* @type {Number}
*/
var STATIC_SPRITE = b2Body.b2_staticBody;
/**
* Spriteの種類（ダイナミック）
* @type {Number}
*/
var DYNAMIC_SPRITE = b2Body.b2_dynamicBody;
/**
* Spriteの種類（キネマティック）
* @type {Number}
*/
var KINEMATIC_SPRITE = b2Body.b2_kinematicBody;

/**
* @scope enchant.PhysicsWorld.prototype
*/
enchant.PhysicsWorld = enchant.Class.create({
    /**
    * 物理シミュレーションを行う世界のクラス
    * @example
    *   //y軸方向へ重力加速度9.8m/s^2
    *   var physicsWorld = new PhysicsWorld(0, 9.8);
    *   //無重力
    *   var physicsWorld = new PhysicsWorld(0, 0);
    * 
    * @param {Number} [gravityX] x軸方向への引力.
    * @param {Number} [gravityY] y軸方向への引力.
    * @constructs
    */
    initialize: function (gravityX, gravityY) {
        var game = enchant.Game.instance;
        this.jointShowSurface = new Surface(game.width, game.height);
        /**
        * 物理シミュレーションの精度
        * @type {Nunber}
        */
        this.iterations = 10;
        world = new b2World(
            new b2Vec2(gravityX, gravityY)  //gravity
            , true                          //allow sleep
        );
    },
    /**
    * 物理シミュレーション内の時間を進める
    * @param {b2Vec2} [pos] Spriteの座標.
    */
    step: function (fps) {
        world.Step(1 / fps, this.iterations, this.iterations);
    },
    /**
    * 物体の当たり判定
    * @example
    *   //ぶつかった2つのSpriteを消す
    *   physicsWorld.contact(function (sprite1, sprite2) {
    *       sprite1.destroy();
    *       sprite2.destroy(); 
    *   });
    *
    * @param {function(sprite1:enchant.PhySprite,sprite2:enchant.PhySprite)} [func] 当たり判定時の処理
    */
    contact: function (func) {
        var c = world.m_contactList;
        if (c) {
            for (var contact = c; contact; contact = contact.m_next) {
                var pos1 = contact.m_fixtureA.m_body.GetPosition().Copy();
                pos1.Subtract(contact.m_fixtureB.m_body.GetPosition());
                pos1.Multiply(WORLD_SCALE);
                var r1 = (contact.m_fixtureA.m_body.m_userData.width + contact.m_fixtureB.m_body.m_userData.width) / 2;
                var r2 = (contact.m_fixtureA.m_body.m_userData.height + contact.m_fixtureB.m_body.m_userData.height) / 2;
                if (Math.abs(pos1.x) <= r1 && Math.abs(pos1.y) <= r2) {
                    func(contact.m_fixtureA.m_body.m_userData, contact.m_fixtureB.m_body.m_userData);
                }
            }
        }
    },
    getJointImage: function () {
        var surface = this.jointShowSurface;
        surface.context.clearRect(0, 0, surface.width, surface.height);
        var drawJoint = function (joint) {
            var b1 = joint.m_bodyA;
            var b2 = joint.m_bodyB;
            var x1 = b1.GetPosition().Copy();
            var x2 = b2.GetPosition().Copy();
            var p1 = joint.GetAnchorA().Copy();
            var p2 = joint.GetAnchorB().Copy();
            x1.Multiply(WORLD_SCALE);
            x2.Multiply(WORLD_SCALE);
            p1.Multiply(WORLD_SCALE);
            p2.Multiply(WORLD_SCALE);
            surface.context.strokeStyle = DrawJointColor;
            surface.context.beginPath();
            switch (joint.m_type) {
                case b2Joint.e_distanceJoint:
                    surface.context.moveTo(p1.x, p1.y);
                    surface.context.lineTo(p2.x, p2.y);
                    break;

                case b2Joint.e_pulleyJoint:
                    var gu1 = joint.GetGroundAnchorA().Copy();
                    var gu2 = joint.GetGroundAnchorB().Copy();
                    gu1.Multiply(WORLD_SCALE);
                    gu2.Multiply(WORLD_SCALE);
                    surface.context.moveTo(x1.x, x1.y);
                    surface.context.lineTo(p1.x, p1.y);
                    surface.context.lineTo(gu1.x, gu1.y);
                    surface.context.lineTo(gu2.x, gu2.y);
                    surface.context.lineTo(x2.x, x2.y);
                    surface.context.lineTo(p2.x, p2.y);
                    break;

                default:
                    if (b1 == world.m_groundBody) {
                        surface.context.moveTo(p1.x, p1.y);
                        surface.context.lineTo(x2.x, x2.y);
                    }
                    else if (b2 == world.m_groundBody) {
                        surface.context.moveTo(p1.x, p1.y);
                        surface.context.lineTo(x1.x, x1.y);
                    }
                    else {
                        surface.context.moveTo(x1.x, x1.y);
                        surface.context.lineTo(p1.x, p1.y);
                        surface.context.lineTo(x2.x, x2.y);
                        surface.context.lineTo(p2.x, p2.y);
                    }
                    break;
            }
            surface.context.stroke();
        };
        for (var j = world.m_jointList; j; j = j.m_next) {
            drawJoint(j);
        }
        return surface;
    },
    /**
    * ワールドにあるすべてのオブジェクトを削除
    * シーンの切り替わり時に呼んでおかないと、次のシーンでも衝突判定がおこってしまう。
    */
    cleanAllSprite: function () {
        var body = world.m_bodyList;
        var nextBody;
        while (body) {
            nextBody = body.m_next;
            if (body.m_userData) {
                body.m_userData.destroy();
            }
            else {
                world.DestroyBody(body);
            }
            body = nextBody;
        }
    },
    /**
    * ワールドにあるすべてのジョイントを削除
    */
    cleanAllJoint: function () {
        var joint = world.m_jointList;
        var nextJoint;
        while (joint) {
            nextJoint = joint.m_next;
            if (joint.m_userData) {
                joint.m_userData.destroy();
            }
            else {
                world.DestroyJoint(joint);
            }
            joint = nextJoint;
        }
    },
    /**
    * ワールドのすべてを削除
    */
    cleanUp: function () {
        this.cleanAllJoint();
        this.cleanAllSprite();
    }
});


/**
* @scope enchant.PhySprite.prototype
*/
enchant.PhySprite = enchant.Class.create(enchant.Sprite, {
    /**
    * 画像表示機能を持った物理シミュレーションクラス.
    * @param {Number} [width] Spriteの横幅.
    * @param {Number} [height] Spriteの高さ.
    * @constructs
    * @extends enchant.Sprite
    */
    initialize: function (width, height) {
        this.body;
        enchant.Sprite.call(this, width, height);

        var time = 0;
        this.addEventListener(enchant.Event.ENTER_FRAME, function (e) {
            this.x = this.x;
            this.y = this.y;
            if (time % 2) {   //なぜか移動と回転を一緒にできない。謎。
                this.rotation = this.angle;
            }
            time = (time + 1) % 2;
        });
    },
    /**
    * 四角形の物理シミュレーション用Sprite生成.
    * @param {Boolean} type 静的,動的,キネマティック
    * @param {Number} density Spriteの密度.
    * @param {Number} friction Spriteの摩擦.
    * @param {Number} restitution Spriteの反発.
    * @param {Boolean} awake Spriteが初めから物理演算を行うか.
    */
    createPhyBox: function (type, density, friction, restitution, awake) {
        var fixDef = new b2FixtureDef;
        fixDef.density = (density !== undefined ? density : 1.0);             // 密度
        fixDef.friction = (friction !== undefined ? friction : 0.5);          // 摩擦
        fixDef.restitution = (restitution !== undefined ? restitution : 0.3); // 反発
        fixDef.shape = new b2PolygonShape;
        fixDef.shape.SetAsBox(this.width / 2 / WORLD_SCALE, this.height / 2 / WORLD_SCALE);
        var bodyDef = new b2BodyDef;
        bodyDef.type = type;
        bodyDef.position.x = 0;
        bodyDef.position.y = 0;
        bodyDef.awake = (awake !== undefined ? awake : true);
        bodyDef.userData = this;
        this.body = world.CreateBody(bodyDef).CreateFixture(fixDef);
        this.setDegugImage();
        return this.body;
    },
    /**
    * 多角形の物理シミュレーション用Sprite生成.
    * @param {b2Vec2[]} vertexs 多角形の頂点配列
    * @param {Boolean} type 静的,動的,キネマティック
    * @param {Number} density Spriteの密度.
    * @param {Number} friction Spriteの摩擦.
    * @param {Number} restitution Spriteの反発.
    * @param {Boolean} awake Spriteが初めから物理演算を行うか.
    */
    createPhyPolygon: function (vertexs, type, density, friction, restitution, awake) {
        for (var i = 0; i < vertexs.length; i++) {
            vertexs[i].Multiply(1 / WORLD_SCALE);
        }
        var fixDef = new b2FixtureDef;
        fixDef.density = (density !== undefined ? density : 1.0);             // 密度
        fixDef.friction = (friction !== undefined ? friction : 0.5);          // 摩擦
        fixDef.restitution = (restitution !== undefined ? restitution : 0.3); // 反発
        fixDef.shape = new b2PolygonShape;
        fixDef.shape.SetAsArray(vertexs, vertexs.length);
        var bodyDef = new b2BodyDef;
        bodyDef.type = type;
        bodyDef.position.x = 0;
        bodyDef.position.y = 0;
        bodyDef.awake = (awake !== undefined ? awake : true);
        bodyDef.userData = this;
        this.body = world.CreateBody(bodyDef).CreateFixture(fixDef);
        this.setDegugImage();
        return this.body;
    },
    /**
    * 円形の物理シミュレーション用Sprite生成.
    * @param {Boolean} type 静的,動的,キネマティック
    * @param {Number} density Spriteの密度.
    * @param {Number} friction Spriteの摩擦.
    * @param {Number} restitution Spriteの反発.
    * @param {Boolean} awake Spriteが初めから物理演算を行うか.
    */
    createPhyCircle: function (type, density, friction, restitution, awake) {
        var fixDef = new b2FixtureDef;
        fixDef.density = (density !== undefined ? density : 1.0);             // 密度
        fixDef.friction = (friction !== undefined ? friction : 0.5);          // 摩擦
        fixDef.restitution = (restitution !== undefined ? restitution : 0.3); // 反発
        fixDef.shape = new b2CircleShape(this.width / 2 / WORLD_SCALE);
        var bodyDef = new b2BodyDef;
        bodyDef.type = type;
        bodyDef.position.x = 0;
        bodyDef.position.y = 0;
        bodyDef.awake = (awake !== undefined ? awake : true);
        bodyDef.userData = this;
        this.body = world.CreateBody(bodyDef).CreateFixture(fixDef);
        this.setDegugImage();
        return this.body;
    },
    /**
    * デバッグ用のイメージをセット
    */
    setDegugImage: function () {
        var surface = new Surface(this.width, this.height);
        surface.context.strokeStyle = DebugDrawStrokeColor;
        surface.context.fillStyle = DebugDrawFillColor;
        surface.context.beginPath();
        var shape = this.body.GetShape();
        switch (shape.m_type) {
            case b2Shape.e_circleShape:
                {
                    var circle = shape;
                    var r = circle.m_radius * WORLD_SCALE - 1;
                    surface.context.arc(this.width / 2, this.height / 2, r, 0, Math.PI * 2, true);
                    surface.context.moveTo(this.width / 2, this.height / 2);
                    surface.context.lineTo(this.width - 1, this.height / 2);
                }
                break;
            case b2Shape.e_polygonShape:
                {
                    var poly = shape;
                    var tV = poly.m_vertices[0];
                    surface.context.moveTo(tV.x * WORLD_SCALE + this.width / 2, tV.y * WORLD_SCALE + this.height / 2);
                    for (var i = 0; i < poly.m_vertexCount; i++) {
                        var v = poly.m_vertices[i];
                        surface.context.lineTo(v.x * WORLD_SCALE + this.width / 2, v.y * WORLD_SCALE + this.height / 2);
                    }
                    surface.context.lineTo(tV.x * WORLD_SCALE + this.width / 2, tV.y * WORLD_SCALE + this.height / 2);
                }
                break;
            default:
                break;
        }
        surface.context.fill();
        surface.context.stroke();
        this.image = surface;
        return surface;
    },
    /**
    * Spriteのタイプ 静的（STATIC_SPRITE）か動的（DYNAMIC_SPRITE)かキネマティック(KINEMATIC_SPRITE)か
    * @type {bool}
    */
    type: {
        get: function () {
            return this.body.m_body.GetType();
        },
        set: function (type) {
            this.body.m_body.SetType(type);
        }
    },
    /**
    * Spriteのx座標.
    * @type {Number}
    */
    x: {
        get: function () {
            return this.body.m_body.GetPosition().x * WORLD_SCALE - this.width / 2;
        },
        set: function (x) {
            this._x = x;
            x += this.width / 2;
            this.body.m_body.SetPosition(new b2Vec2(x / WORLD_SCALE, this.body.m_body.GetPosition().y));
            this._updateCoordinate();
        }
    },
    /**
    * Spriteのy座標.
    * @type {Number}
    */
    y: {
        get: function () {
            return this.body.m_body.GetPosition().y * WORLD_SCALE - this.height / 2;
        },
        set: function (y) {
            this._y = y;
            y += this.height / 2;
            this.body.m_body.SetPosition(new b2Vec2(this.body.m_body.GetPosition().x, y / WORLD_SCALE));
            this._updateCoordinate();
        }
    },
    /**
    * Spriteの中心のx座標.
    * @type {Number}
    */
    centerX: {
        get: function () {
            return this.x + this.width / 2;
        },
        set: function (x) {
            this.x = x - this.width / 2;
        }
    },
    /**
    * Spriteの中心のy座標.
    * @type {Number}
    */
    centerY: {
        get: function () {
            return this.y + this.height / 2;
        },
        set: function (y) {
            this.y = y - this.height / 2;
        }
    },
    /**
    * Spriteの中心座標ベクトル.
    * @type {b2Vec2}
    */
    position: {
        get: function () {
            var pos = this.body.m_body.GetPosition().Copy();
            pos.Multiply(WORLD_SCALE);
            return pos;
        },
        set: function (pos) {
            this.centerX = pos.x;
            this.centerY = pos.y;
            this.body.m_body.SetPosition(new b2Vec2(pos.x / WORLD_SCALE, pos.y / WORLD_SCALE));
        }
    },
    /**
    * Spriteのx座標の速度（単位はpx/s）.
    * @type {Number}
    */
    vx: {
        get: function () {
            return this.body.m_body.GetLinearVelocity().x * WORLD_SCALE;
        },
        set: function (x) {
            this.body.m_body.SetLinearVelocity(new b2Vec2(x / WORLD_SCALE, this.body.m_body.GetLinearVelocity().y));
        }
    },
    /**
    * Spriteのy座標の速度（単位はpx/s）.
    * @type {Number}
    */
    vy: {
        get: function () {
            return this.body.m_body.GetLinearVelocity().y * WORLD_SCALE;
        },
        set: function (y) {
            this.body.m_body.SetLinearVelocity(new b2Vec2(this.body.m_body.GetLinearVelocity().x, y / WORLD_SCALE));
        }
    },
    /**
    * Spriteの速度（単位はpx/s）.
    * @type {b2Vec2}
    */
    velocity: {
        get: function () {
            var v = this.body.m_body.GetLinearVelocity().Copy();
            v.Multiply(WORLD_SCALE);
            return v;
        },
        set: function (v) {
            this.body.m_body.SetLinearVelocity(new b2Vec2(v.x / WORLD_SCALE, v.y / WORLD_SCALE));
        }
    },
    /**
    * Spriteの角度 (度数法)..
    * @type {Number}
    */
    angle: {
        get: function () {
            return this.body.m_body.GetAngle() * (180 / Math.PI);
        },
        set: function (angle) {
            this.rotation = angle;
            this.body.m_body.SetAngle(angle * (Math.PI / 180));
        }
    },
    /**
    * Spriteの角速度（単位はdeg/s）.
    * @type {b2Vec2}
    */
    angularVelocity: {
        get: function () {
            return this.body.m_body.GetAngularVelocity() * (180 / Math.PI);
        },
        set: function (omega) {
            this.setAwake(true);
            this.body.m_body.SetAngularVelocity(omega * (Math.PI / 180));
        }
    },
    /**
    * 継続的な力を加える
    * @param {b2Vec2} force 加える力のベクトル
    */
    applyForce: function (force) {
        this.setAwake(true);
        this.body.m_body.ApplyForce(force, this.body.m_body.GetPosition());
    },
    /**
    * 瞬間的な力を加える
    * @param {b2Vec2} impulse 加える力のベクトル
    */
    applyImpulse: function (impulse) {
        this.setAwake(true);
        this.body.m_body.ApplyImpulse(impulse, this.body.m_body.GetPosition());
    },
    /**
    * 継続的な回転力を与える
    * @param {Number} torque 加える回転力
    */
    applyTorque: function (torque) {
        this.setAwake(true);
        this.body.m_body.ApplyTorque(torque);
    },
    /**
    * 物理シミュレーションされているか
    * 物体の動きが止まると処理コスト軽減のためsleep状態になる
    * @type {Boolean}
    */
    sleep: {
        get: function () {
            return this.body.m_body.IsSleepingAllowed();
        },
        set: function (flag) {
            this.setAwake(true);
            this.body.m_body.SetSleepingAllowed(flag);
        }
    },
    /**
    * 物理シミュレーションされていない時、物理シミュレーションを行う(sleep時は動かなくなるので)
    * @param {Boolean} flag 物理シミュレーションを行うかどうか
    */
    setAwake: function (flag) {
        this.body.m_body.SetAwake(flag);
    },
    /**
    * アクティブかどうか
    * 物理シミュレーションが行われて、他の物体に干渉できるか
    * @type {Boolean}
    */
    active: {
        get: function () {
            return this.body.m_body.IsActive();
        },
        set: function (flag) {
            this.body.m_body.SetActive(flag);
        }
    },
    /**
    * 表示/非表示(物理シミュレーションも止まる)
    * @type {Boolean}
    */
    visible: {
        get: function () {
            return this.active;
        },
        set: function (visible) {
            if (this._visible == visible) {
                this._style.display = 'block';
            } else {
                this._style.display = 'none';
            }
            this.active = visible;
        }
    },
    /**
    * 静的オブジェクトかどうか
    * @return {Boolean}
    */
    isStatic: function () {
        return (this.type == STATIC_SPRITE);
    },
    /**
    * 動的オブジェクトかどうか
    * @return {Boolean}
    */
    isDynamic: function () {
        return (this.type == DYNAMIC_SPRITE);
    },
    /**
    * キネマティックオブジェクトかどうか
    * @return {Boolean}
    */
    isKinematic: function () {
        return (this.type == KINEMATIC_SPRITE);
    },
    /**
    * 衝突判定
    * @example
    *   //bearに当たったSpriteを消す
    *   bear.contact(function (sprite) {
    *      sprite.destroy(); 
    *   });
    * 
    * @param {function(sprite:enchant.PhySprite)} [func] ぶつかったSpriteを引数とする関数
    */
    contact: function (func) {
        var c = this.body.m_body.m_contactList;
        if (c) {
            for (var contact = c.contact; contact; contact = contact.m_next) {
                var pos1 = contact.m_fixtureA.m_body.GetPosition().Copy();
                pos1.Subtract(contact.m_fixtureB.m_body.GetPosition());
                pos1.Multiply(WORLD_SCALE);
                var r1 = (contact.m_fixtureA.m_body.m_userData.width + contact.m_fixtureB.m_body.m_userData.width) / 1.5;
                var r2 = (contact.m_fixtureA.m_body.m_userData.height + contact.m_fixtureB.m_body.m_userData.height) / 1.5;
                if (Math.abs(pos1.x) <= r1 && Math.abs(pos1.y) <= r2) {
                    //片方が自分ならもう片方をぶつかった相手として処理する
                    if (this.body.m_body == contact.m_fixtureA.m_body)
                        func(contact.m_fixtureB.m_body.m_userData);
                    else if (this.body.m_body == contact.m_fixtureB.m_body)
                        func(contact.m_fixtureA.m_body.m_userData);
                }
            }
        }
    },
    /**
    * 物体の削除
    * removeChildではなくこちらでSpriteを取り除く
    */
    destroy: function () {
        if (this.scene !== null) {
            world.DestroyBody(this.body.m_body);
            this.body.Destroy();
            this.scene.removeChild(this);
        }
    },
    /**
    * bodyの取得
    * Box2Dの処理を各自行いたい時に取得する
    */
    getBody: function () {
        return this.body;
    }

});

/**
* @scope enchant.PhyBoxSprite.prototype
*/
enchant.PhyBoxSprite = enchant.Class.create(enchant.PhySprite, {
    /**
    * 四角形の物理シミュレーション用Sprite
    * @example
    *   var bear = new PhyBoxSprite(32, 32, DYNAMIC_SPRITE, 1.0, 0.5, 0.3, true);
    *   bear.image = game.assets['chara1.gif'];
    * 
    * @param {Number} [width] Spriteの横幅.
    * @param {Number} [height] Spriteの高さ.
    * @param {Boolean} [type] 静的,動的,キネマティック
    * @param {Number} [density] Spriteの密度.
    * @param {Number} [friction] Spriteの摩擦.
    * @param {Number} [restitution] Spriteの反発.
    * @param {Boolean}   [awake] Spriteが初めから物理演算を行うか.
    * @constructs
    * @extends enchant.PhySprite
    */
    initialize: function (width, height, type, density, friction, restitution, awake) {
        enchant.PhySprite.call(this, width, height);

        //物理オブジェクトの生成
        this.createPhyBox(type, density, friction, restitution, awake);
    }
});


/**
* @scope enchant.PhyCircleSprite.prototype
*/
enchant.PhyCircleSprite = enchant.Class.create(enchant.PhySprite, {
    /**
    * 円の物理シミュレーション用Sprite
    * @example
    *   var bear = new PhyCircleSprite(16, DYNAMIC_SPRITE, 1.0, 0.5, 0.3, true);
    *   bear.image = game.assets['chara1.gif'];
    * 
    * @param {Number} [radius] Spriteの半径.
    * @param {Boolean} [type] 静的,動的,キネマティック
    * @param {Number} [density] Spriteの密度.
    * @param {Number} [friction] Spriteの摩擦.
    * @param {Number} [restitution] Spriteの反発.
    * @param {Boolean}   [awake] Spriteが初めから物理演算を行うか.
    * @constructs
    * @extends enchant.PhySprite
    */
    initialize: function (radius, type, density, friction, restitution, awake) {
        enchant.PhySprite.call(this, radius * 2, radius * 2);

        //物理オブジェクトの生成
        this.createPhyCircle(type, density, friction, restitution, awake);
    }
});

/**
* @scope enchant.PhyPolygonSprite.prototype
*/
enchant.PhyPolygonSprite = enchant.Class.create(enchant.PhySprite, {
    /**
    * 多角形の物理シミュレーション用Sprite
    * @example
    * var vertexCount = 5;
    * var radius = 20;
    * var vertexs = new Array();
    * for (var i = 0; i < vertexCount; i++) {
    *     vertexs[i] = new b2Vec2(radius * Math.cos(2 * Math.PI / vertexCount * i), radius * Math.sin(2 * Math.PI / vertexCount * i));
    * }
    * var phyPolygonSprite = new PhyPolygonSprite(radius * 2, radius * 2,vertexs, DYNAMIC_SPRITE, 1.0, 0.1, 0.2, true);
    * @param {Number} [width] Spriteの横幅.
    * @param {Number} [height] Spriteの高さ.
    * @param {b2Vec2[]} vertexs 多角形の頂点配列
    * @param {Boolean} [type] 静的,動的,キネマティック
    * @param {Number} [density] Spriteの密度.
    * @param {Number} [friction] Spriteの摩擦.
    * @param {Number} [restitution] Spriteの反発.
    * @param {Boolean}   [awake] Spriteが初めから物理演算を行うか.
    * @constructs
    * @extends enchant.PhySprite
    */
    initialize: function (width, height, vertexs, type, density, friction, restitution, awake) {
        enchant.PhySprite.call(this, width, height);
        //物理オブジェクトの生成
        this.createPhyPolygon(vertexs, type, density, friction, restitution, awake);
    }
});


/**
* @scope enchant.BaseJoint.prototype
*/
enchant.BaseJoint = enchant.Class.create({
    /**
    * ジョイントの親クラス
    * @param {enchant.PhySprite} [sprite1] 繋げるスプライト1
    * @param {enchant.PhySprite} [sprite2] 繋げるスプライト2
    * @constructs
    */
    initialize: function (sprite1, sprite2) {
        this.joint = null;
        /**
        * ジョイントのアンカー1.
        * @type {PhySprite}
        */
        this.sprite1 = sprite1;
        /**
        * ジョイントのアンカー2.
        * @type {PhySprite}
        */
        this.sprite2 = sprite2;
    },
    /**
    * ジョイントの削除
    */
    destroy: function () {
        if (this.joint !== null) {
            world.DestroyJoint(this.joint);
            this.joint = null;
        }
    }
});

/**
* @scope enchant.PhyDistanceJoint.prototype
*/
enchant.PhyDistanceJoint = enchant.Class.create(enchant.BaseJoint, {
    /**
    * 距離ジョイント
    * @example
    * //軸
    * var axis = new PhyCircleSprite(8, STATIC_SPRITE);
    * axis.position = { x: 160, y: 160 };
    * game.rootScene.addChild(axis); // シーンに追加
    * //ボール生成
    * var ball = new PhyCircleSprite(8, DYNAMIC_SPRITE);
    * ball.position = { x: 100, y: 250 };
    * game.rootScene.addChild(ball); // シーンに追加
    * //距離ジョイント
    * var joint = new PhyDistanceJoint(axis, ball);
    * @param {enchant.PhySprite} [sprite1] 繋げるスプライト1
    * @param {enchant.PhySprite} [sprite2] 繋げるスプライト2
    * @constructs
    * @extends enchant.BaseJoint
    */
    initialize: function (sprite1, sprite2) {
        enchant.BaseJoint.call(this, sprite1, sprite2);

        var jointDef = new b2DistanceJointDef();
        jointDef.Initialize(sprite1.body.m_body, sprite2.body.m_body, sprite1.body.m_body.GetPosition(), sprite2.body.m_body.GetPosition());
        this.joint = world.CreateJoint(jointDef);
    },
    /**
    * ジョイントの距離
    * @type {Number}
    */
    length: {
        get: function () {
            return this.joint.m_length * WORLD_SCALE;
        },
        set: function (length) {
            this.joint.m_length = length / WORLD_SCALE;
        }
    },
    /**
    * 減衰比. 0 =減衰なし、1 =臨界減衰。
    * @type {Number}
    */
    dampingRatio: {
        get: function () {
            return this.joint.m_dampingRatio;
        },
        set: function (dampingRatio) {
            this.joint.m_dampingRatio = dampingRatio;
        }
    },
    /**
    * 応答速度. 
    * @type {Number}
    */
    frequencyHz: {
        get: function () {
            return this.joint.m_frequencyHz;
        },
        set: function (frequencyHz) {
            this.joint.m_frequencyHz = frequencyHz;
        }
    }
});


/**
* @scope enchant.PhyRevoluteJoint.prototype
*/
enchant.PhyRevoluteJoint = enchant.Class.create(enchant.BaseJoint, {
    /**
    * 物体と物体のモーター付きジョイント 
    * @example
    * //軸
    * var axis = new PhyCircleSprite(8, STATIC_SPRITE);
    * axis.position = { x: 160, y: 160 };
    * game.rootScene.addChild(axis); // シーンに追加
    * //ボール生成
    * var ball = new PhyCircleSprite(8, DYNAMIC_SPRITE);
    * ball.position = { x: 100, y: 250 };
    * game.rootScene.addChild(ball); // シーンに追加
    * //距離ジョイント
    * var joint = new PhyRevoluteJoint(axis, ball);
    * joint.enableMotor = true;
    * joint.maxMotorTorque = 100;
    * joint.motorSpeed = 90;
    * @param {enchant.PhySprite} [axis] 軸となるスプライト
    * @param {enchant.PhySprite} [sprite] 繋げるスプライト
    * @constructs
    * @extends enchant.BaseJoint
    */
    initialize: function (axis, sprite) {
        enchant.BaseJoint.call(this, axis, sprite);

        var joint_def = new b2RevoluteJointDef();
        joint_def.Initialize(sprite.body.m_body, axis.body.m_body, axis.body.m_body.GetWorldCenter());

        //create and save the joint
        this.joint = world.CreateJoint(joint_def);
    },
    /**
    * モータの回転速度(deg/s)
    * @type {Number}
    */
    motorSpeed: {
        get: function () {
            return this.joint.m_motorSpeed * (180 / Math.PI);
        },
        set: function (speed) {
            this.joint.m_motorSpeed = speed * (Math.PI / 180);
        }
    },
    /**
    * モータを有効化/無効化
    * @type {Boolean}
    */
    enableMotor: {
        get: function () {
            return this.joint.m_enableMotor;
        },
        set: function (enableMotor) {
            this.joint.m_enableMotor = enableMotor;
        }
    },
    /**
    * トルクの最大値
    * @type {Number}
    */
    maxMotorTorque: {
        get: function () {
            return this.joint.m_maxMotorTorque;
        },
        set: function (maxMotorTorque) {
            this.joint.m_maxMotorTorque = maxMotorTorque;
        }
    },
    /**
    * 限界の有効化/無効化
    * @type {Boolean}
    */
    enableLimit: {
        get: function () {
            return this.joint.m_enableLimit;
        },
        set: function (enableLimit) {
            this.joint.m_enableLimit = enableLimit;
        }
    },
    /**
    * 最低角度
    * @type {Number}
    */
    lowerAngle: {
        get: function () {
            return this.joint.m_lowerAngle * (180 / Math.PI);
        },
        set: function (lowerAngle) {
            this.joint.m_lowerAngle = lowerAngle * (Math.PI / 180);
        }
    },
    /**
    * 最高角度
    * @type {Number}
    */
    upperAngle: {
        get: function () {
            return this.joint.m_upperAngle * (180 / Math.PI);
        },
        set: function (upperAngle) {
            this.joint.m_upperAngle = upperAngle * (Math.PI / 180);
        }
    },
    /**
    * 最高/最低角度の設定
    * @param {Number} [lower] 最低角度
    * @param {Number} [upper] 最高角度
    */
    setLimits: function (lower, upper) {
        this.joint.SetLimits(lower * (Math.PI / 180), upper * (Math.PI / 180));
    },
    getJointAngle: function () {
        return this.joint.GetJointAngle() * (180 / Math.PI);
    }
});


/**
* @scope enchant.PhyPulleyJoint.prototype
*/
enchant.PhyPulleyJoint = enchant.Class.create(enchant.BaseJoint, {
    /**
    * 滑車ジョイント
    * @example
    * var ball1 = new PhyCircleSprite(8, DYNAMIC_SPRITE);
    * ball1.position = { x: 80, y: 160 };
    * var ball2 = new PhyCircleSprite(8, DYNAMIC_SPRITE);
    * ball2.position = { x: 240, y: 160 };
    * //滑車ジョイント
    * var pulleyJoint = new PhyPulleyJoint(ball1, ball2, new b2Vec2(80, 100), new b2Vec2(240, 100), 1);
    * @param {enchant.PhySprite} [sprite1] 繋げるスプライト1
    * @param {enchant.PhySprite} [sprite2] 繋げるスプライト2
    * @param {b2Vec2} [anchor1] アンカー1の位置
    * @param {b2Vec2} [anchor2] アンカー2の位置
    * @param {Number} [ratio] 左右のバランス
    * @constructs
    * @extends enchant.BaseJoint
    */
    initialize: function (sprite1, sprite2, anchor1, anchor2, ratio) {
        enchant.BaseJoint.call(this, sprite1, sprite2);

        anchor1.Multiply(1 / WORLD_SCALE);
        anchor2.Multiply(1 / WORLD_SCALE);

        var jointDef = new b2PulleyJointDef();
        jointDef.Initialize(sprite1.body.m_body, sprite2.body.m_body, anchor1, anchor2, sprite1.body.m_body.GetPosition(), sprite2.body.m_body.GetPosition(), ratio);

        this.joint = world.CreateJoint(jointDef);
    }
});

/**
* @scope enchant.PhyPrismaticJoint.prototype
*/
enchant.PhyPrismaticJoint = enchant.Class.create(enchant.BaseJoint, {
    /**
    * スライドジョイント    
    * @example
    * var box = new PhyBoxSprite(16, 8, DYNAMIC_SPRITE, 1.0, 0.5, 0.2, true);
    * box.position = { x: game.width * 2 / 3, y: game.height / 2 };
    * var prismaticAxis = new b2Vec2(1.0, 0);   //x軸にスライドを設定(右が正の値)
    * //スライドジョイント
    * var prismaticJoint = new PhyPrismaticJoint(box, prismaticAxis);
    * //スライドオブジェクトにモーター機能を持たせる場合
    * //prismaticJoint.enableMotor = true;      //モータの有効化
    * //prismaticJoint.maxMotorForce = 100.0;   //モータの最大力を設定
    * //prismaticJoint.motorSpeed = 50;         //モータの速度を設定
    * @param {enchant.PhySprite} [sprite1] スライドさせるスプライト
    * @param {b2Vec2} [axis] 軸
    * @constructs
    * @extends enchant.BaseJoint
    */
    initialize: function (sprite1, axis) {
        enchant.BaseJoint.call(this, sprite1, null);

        var jointDef = new b2PrismaticJointDef();
        jointDef.Initialize(world.GetGroundBody(), sprite1.body.m_body, sprite1.body.m_body.GetPosition(), axis);

        this.joint = world.CreateJoint(jointDef);
    },
    /**
    * モータを有効化/無効化
    * @type {Boolean}
    */
    enableMotor: {
        get: function () {
            return this.joint.m_enableMotor;
        },
        set: function (enableMotor) {
            this.joint.m_enableMotor = enableMotor;
        }
    },
    /**
    * 限界の有効化/無効化
    * @type {Boolean}
    */
    enableLimit: {
        get: function () {
            return this.joint.m_enableLimit;
        },
        set: function (enableLimit) {
            this.joint.m_enableLimit = enableLimit;
        }
    },
    /**
    * 下ジョイント制限
    * @type {Number}
    */
    lowerTranslation: {
        get: function () {
            return this.joint.m_lowerTranslation * WORLD_SCALE;
        },
        set: function (lowerTranslation) {
            this.joint.m_lowerTranslation = lowerTranslation / WORLD_SCALE;
        }
    },
    /**
    * 上ジョイント制限
    * @type {Number}
    */
    upperTranslation: {
        get: function () {
            return this.joint.m_upperTranslation * WORLD_SCALE;
        },
        set: function (upperTranslation) {
            this.joint.m_upperTranslation = upperTranslation / WORLD_SCALE;
        }
    },
    /**
    * ジョイント制限の設定
    * @param {Number} [lower] 下ジョイント
    * @param {Number} [upper] 上ジョイント
    */
    setLimits: function (lower, upper) {
        this.lowerTranslation = lower;
        this.upperTranslation = upper;
    },
    /**
    * モーターの力の最大値
    * @type {Number}
    */
    maxMotorForce: {
        get: function () {
            return this.joint.maxMotorForce;
        },
        set: function (maxMotorForce) {
            this.joint.m_maxMotorForce = maxMotorForce;
        }
    },
    /**
    * モーターのスピード
    * @type {Number}
    */
    motorSpeed: {
        get: function () {
            return this.joint.m_motorSpeed * WORLD_SCALE;
        },
        set: function (motorSpeed) {
            this.joint.m_motorSpeed = motorSpeed / WORLD_SCALE;
        }
    }
});


//実装する予定は未定
//enchant.PhyGearJoint = enchant.Class.create(enchant.BaseJoint, {
//    /**
//    * 歯車ジョイント
//    * @param {enchant.PhySprite} [sprite1] 繋げるスプライト1
//    * @param {enchant.PhySprite} [sprite2] 繋げるスプライト2
//    * @param {Number} [ratio] 左右のバランス
//    * @constructs
//    * @extends enchant.BaseJoint
//    */
//    initialize: function (sprite1, sprite2, ratio) {
//        enchant.BaseJoint.call(this, sprite1, sprite2);
//        var ground = world.GetGroundBody();
//        var jointDef = new b2GearJointDef();
//        jointDef.body1 = sprite1.body.m_body;
//        jointDef.body2 = sprite2.body.m_body;
//        jointDef.joint1 = ;
//        jointDef.joint2 = ;
//        jointDef.ratio = ratio;
//        this.joint = world.CreateJoint(jointDef);
//    }
//});
